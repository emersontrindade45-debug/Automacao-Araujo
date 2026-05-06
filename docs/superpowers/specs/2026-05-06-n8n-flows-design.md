# Design: Fluxos N8n com IA — Araujo Hub (M7)

**Data:** 2026-05-06
**Branch alvo:** `feat/n8n-flows`
**Instância N8n:** `https://n8n.evoapi.shop` (v2.51.1)

---

## Contexto

O Araujo Hub é um CRM de atendimento para varejo (mercearias, açougues, padarias) integrado ao WhatsApp via **Evolution API** (`https://evo.evoapi.shop`). Os fluxos N8n são responsáveis por processar as mensagens recebidas, classificar intenções via GPT-4o e executar ações (responder, fechar pedido, handoff para humano, follow-up, notificação de preço).

A **Evolution API envia webhooks diretamente ao N8n** (sem passar pelo Hub). O N8n processa, responde ao cliente via Evolution API e devolve handoffs estruturados ao Hub via `POST /api/webhooks/n8n`.

**Envio de mensagens:** `POST https://evo.evoapi.shop/message/sendText/{instance}` com `{ number, text }` — Evolution API v2.

---

## Decisões de Design

| Questão | Decisão |
|---------|---------|
| Workflow vazio existente | Deletado — criar todos do zero |
| Integração WhatsApp | Evolution API (`https://evo.evoapi.shop`) — substitui Evolution API completamente |
| Entrada de mensagens | Evolution API envia webhook diretamente ao N8n (sem passar pelo Hub) |
| Envio de mensagens | `POST https://evo.evoapi.shop/message/sendText/{instance}` com `{ number, text }` |
| Catálogo no Fluxo 1 | Hub `/api/produtos` com fallback para Supabase REST direto |
| Estado do Fluxo 2 (multi-turno) | Data Table N8n (chave: telefone) |
| Sinalização Fluxo 1 → Fluxo 3 | Campo `tipo` no payload: `"humano"` ou `"sem_resposta"` |
| Número WhatsApp inválido no Fluxo 5 | Tenta enviar — Evolution API retorna erro, N8n loga e continua |

---

## Arquitetura Geral

```
WhatsApp
        │
        ▼
Evolution API (evo.evoapi.shop)
  envia webhook diretamente ao N8n
        │
        ▼
[Fluxo 1] Atendimento Principal  (webhook: /atendimento-entrada)
        │
        ├─ saudacao / consulta_preco / fora_escopo
        │       └──► Evolution API → responde ao cliente
        │
        ├─ fazer_pedido
        │       └──► [Fluxo 2] Fechamento de Pedido (webhook: /fechamento-pedido)
        │                   Data Table N8n: histórico por telefone
        │                   GPT-4o multi-turno: coleta itens, endereço, pagamento
        │                   completo=true → POST /api/webhooks/n8n (pedido_confirmado)
        │                   completo=false → Evolution API → solicita próximo dado
        │
        └─ humano
                └──► [Fluxo 3] Handoff para Humano (webhook: /handoff-humano)
                            tipo=sem_resposta → POST /api/webhooks/n8n (sem_resposta)
                            tipo=humano → POST /api/webhooks/n8n (ambiguo)
                            ambos → Evolution API → avisa cliente

[Fluxo 4] Follow-up Cron
  Schedule: 0 9 * * 1-6 (America/Sao_Paulo)
  → POST {HUB_URL}/api/followup (x-cron-secret)
  → loga sucesso ou erro

[Fluxo 5] Notificação de Preço (webhook: /notificacao-preco)
  Trigger: Hub após aprovar preço
  → monta mensagem → tenta WhatsApp → Respond to Webhook
```

---

## Fluxo 1 — Atendimento Principal

**Arquivo:** `n8n/workflows/01-atendimento-principal.json`
**Trigger:** `POST /webhook/atendimento-entrada`

### Payload de entrada
```json
{
  "telefone": "5511999999999",
  "mensagem": "Olá, quero saber o preço da picanha",
  "canal": "whatsapp",
  "nome_cliente": "João Silva"
}
```

### Nós

| # | Nó | Tipo | Detalhes |
|---|-----|------|----------|
| 1 | Webhook Trigger | `n8n-nodes-base.webhook` | POST /atendimento-entrada |
| 2 | Buscar Cliente | `n8n-nodes-base.httpRequest` | GET `{SUPABASE_URL}/rest/v1/clientes?telefone=eq.{telefone}&select=*` |
| 3 | Buscar Catálogo (Hub) | `n8n-nodes-base.httpRequest` | GET `{HUB_URL}/api/produtos` — tenta primeiro |
| 4 | Fallback Catálogo (Supabase) | `n8n-nodes-base.httpRequest` | GET `{SUPABASE_URL}/rest/v1/produtos?ativo=eq.true&select=nome,preco,unidade` — se Hub falhar |
| 5 | Montar Contexto | `n8n-nodes-base.set` | Combina cliente + catálogo + etapa_atual |
| 6 | IA Atendimento | `@n8n/n8n-nodes-langchain.openAi` | GPT-4o, retorna `{ resposta, intencao }` |
| 7 | Parse IA | `n8n-nodes-base.code` | JS: `JSON.parse(items[0].json.message.content)` |
| 8 | Switch Intenção | `n8n-nodes-base.switch` | Cases: `fazer_pedido`, `humano`, default |
| 9a | Chamar Fluxo 2 | `n8n-nodes-base.httpRequest` | POST /webhook/fechamento-pedido |
| 9b | Chamar Fluxo 3 | `n8n-nodes-base.httpRequest` | POST /webhook/handoff-humano |
| 9c | Enviar WhatsApp | `n8n-nodes-base.httpRequest` | POST Evolution API |

### System Prompt GPT-4o
```
Você é um atendente virtual da loja {nome_loja}. Horário: {horario}. Endereço: {endereco}.

Catálogo atual:
{catalogo_formatado}

Cliente: {nome_cliente} | Etapa atual: {etapa_atual}

Responda naturalmente como atendente. Retorne SOMENTE JSON válido:
{ "resposta": "...", "intencao": "saudacao|consulta_preco|fazer_pedido|fora_escopo|humano" }
```

### Intenções
| Intenção | Ação |
|----------|------|
| `saudacao` | Responde via Evolution API |
| `consulta_preco` | Responde com preços do catálogo |
| `fazer_pedido` | Aciona Fluxo 2 |
| `fora_escopo` | Responde com aviso educado |
| `humano` | Aciona Fluxo 3 com `tipo: "humano"` |

---

## Fluxo 2 — Fechamento de Pedido

**Arquivo:** `n8n/workflows/02-fechamento-pedido.json`
**Trigger:** `POST /webhook/fechamento-pedido`

### Payload de entrada
```json
{
  "telefone": "5511999999999",
  "nome_cliente": "João Silva",
  "canal": "whatsapp",
  "mensagem": "Quero 2kg de picanha e 1kg de frango"
}
```

### Data Table N8n
**Nome:** `pedido_em_aberto`
**Colunas:** `telefone` (string, chave), `historico` (string/JSON), `dados_parciais` (string/JSON), `turnos` (number), `atualizado_em` (date)

### Nós

| # | Nó | Tipo | Detalhes |
|---|-----|------|----------|
| 1 | Webhook Trigger | `n8n-nodes-base.webhook` | POST /fechamento-pedido |
| 2 | Buscar Estado | `n8n-nodes-base.n8nTrainingCustomOperations` | getRows por telefone |
| 3 | Buscar Catálogo | `n8n-nodes-base.httpRequest` | Supabase REST (com IDs de produto) |
| 4 | IA Coleta Pedido | `@n8n/n8n-nodes-langchain.openAi` | GPT-4o com function calling |
| 5 | Parse + Merge Estado | `n8n-nodes-base.code` | JS: merge dados_coletados + estado anterior |
| 6 | Salvar Estado | Data Table upsertRows | chave: telefone |
| 7 | IF pedido_completo | `n8n-nodes-base.if` | verifica `pedido_completo === true` |
| 8a (sim) | POST Hub | `n8n-nodes-base.httpRequest` | POST /api/webhooks/n8n — tipo: pedido_confirmado |
| 8b (sim) | Limpar Estado | Data Table deleteRows | remove linha pelo telefone |
| 8c (não) | Enviar WhatsApp | `n8n-nodes-base.httpRequest` | Evolution API — próxima pergunta |

### System Prompt GPT-4o (Fluxo 2)
```
Você está coletando um pedido para a loja {nome_loja}.

Catálogo (use os IDs exatos):
{catalogo_com_ids}

Estado atual do pedido: {dados_parciais}
Histórico da conversa: {historico}
Nova mensagem do cliente: {mensagem}

Colete: itens_pedido (produto_id, nome, quantidade, preco_unitario),
endereco_entrega, forma_pagamento (pix/dinheiro/cartao_credito), observacoes.

Retorne SOMENTE JSON válido:
{
  "resposta": "...",
  "pedido_completo": true|false,
  "dados_coletados": { "itens_pedido": [], "endereco_entrega": "", "forma_pagamento": "", "observacoes": "" }
}
```

### Limite de turnos
Se `turnos >= 8` sem `pedido_completo`, acionar Fluxo 3 com `tipo: "sem_resposta"`.

---

## Fluxo 3 — Handoff para Humano

**Arquivo:** `n8n/workflows/03-handoff-humano.json`
**Trigger:** `POST /webhook/handoff-humano`

### Payload de entrada
```json
{
  "tipo": "humano",
  "nome": "João Silva",
  "telefone": "5511999999999",
  "canal": "whatsapp",
  "atendente_email": "atendente@loja.com",
  "ultimas_mensagens": ["Quero reclamar de um pedido"]
}
```

### Nós

| # | Nó | Tipo | Detalhes |
|---|-----|------|----------|
| 1 | Webhook Trigger | `n8n-nodes-base.webhook` | POST /handoff-humano |
| 2 | Switch tipo | `n8n-nodes-base.switch` | Cases: `sem_resposta`, default (`humano`) |
| 3a | POST Hub sem_resposta | `n8n-nodes-base.httpRequest` | tipo: sem_resposta → etapa: follow_up |
| 3b | POST Hub ambiguo | `n8n-nodes-base.httpRequest` | tipo: ambiguo → etapa: atendimento |
| 4 | Avisar Cliente WhatsApp | `n8n-nodes-base.httpRequest` | "Aguarde, um atendente irá continuar o seu atendimento em breve. 😊" |

---

## Fluxo 4 — Follow-up Cron

**Arquivo:** `n8n/workflows/04-followup-cron.json`
**Trigger:** Schedule `0 9 * * 1-6` | Timezone: `America/Sao_Paulo`

### Nós

| # | Nó | Tipo | Detalhes |
|---|-----|------|----------|
| 1 | Schedule Trigger | `n8n-nodes-base.scheduleTrigger` | Cron: `0 9 * * 1-6` |
| 2 | Chamar /api/followup | `n8n-nodes-base.httpRequest` | POST `{HUB_URL}/api/followup` + header `x-cron-secret` |
| 3 | IF status 200 | `n8n-nodes-base.if` | `$response.statusCode === 200` |
| 4a (sim) | Log Sucesso | `n8n-nodes-base.set` | `{ status: "ok", processados: response.processados, executadoEm: now }` |
| 4b (não) | Log Erro | `n8n-nodes-base.set` | `{ status: "erro", statusCode, executadoEm: now }` |

---

## Fluxo 5 — Notificação de Preço Aprovado

**Arquivo:** `n8n/workflows/05-notificacao-preco.json`
**Trigger:** `POST /webhook/notificacao-preco`

### Payload de entrada
```json
{
  "tipo": "atualizacao_preco",
  "produto_nome": "Picanha",
  "preco_novo": 95.90,
  "solicitado_por": "5511999999999"
}
```

### Nós

| # | Nó | Tipo | Detalhes |
|---|-----|------|----------|
| 1 | Webhook Trigger | `n8n-nodes-base.webhook` | POST /notificacao-preco |
| 2 | Montar Mensagem | `n8n-nodes-base.code` | JS: formata texto com produto e preço |
| 3 | Enviar WhatsApp | `n8n-nodes-base.httpRequest` | Evolution API — tenta mesmo se número inválido; erro logado |
| 4 | Respond to Webhook | `n8n-nodes-base.respondToWebhook` | `{ ok: true }` |

---

## Credenciais N8n (criar uma vez)

| Nome | Tipo N8n | Header/Campo | Valor |
|------|----------|--------------|-------|
| `OpenAI` | `openAiApi` | API Key | `OPENAI_API_KEY` |
| `Evolution API` | `httpHeaderAuth` | `apikey` | `EVOLUTION_API_KEY` |
| `Hub N8n Secret` | `httpHeaderAuth` | `x-n8n-secret` | `N8N_WEBHOOK_SECRET` |

---

## Variáveis de Ambiente N8n

Configure em **Settings → Environment Variables**:

| Variável | Exemplo |
|----------|---------|
| `HUB_URL` | `https://araujo-hub.vercel.app` |
| `SUPABASE_URL` | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` |
| `N8N_WEBHOOK_SECRET` | `meu-secret-seguro` |
| `EVOLUTION_API_URL` | `https://evo.evoapi.shop` |
| `EVOLUTION_API_KEY` | `sua-api-key-evolution` |
| `EVOLUTION_INSTANCE` | `nome-da-instancia` |
| `CRON_SECRET` | `cron-secret-seguro` |

---

## Data Table N8n

**Nome:** `pedido_em_aberto`
**Finalidade:** Estado multi-turno do Fluxo 2

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `telefone` | string | Chave de lookup |
| `historico` | string | JSON serializado das mensagens trocadas |
| `dados_parciais` | string | JSON com campos coletados até agora |
| `turnos` | number | Contador de turnos (limit: 8) |
| `atualizado_em` | string | ISO timestamp |

---

## Ordem de Criação e Ativação

1. Criar credenciais (OpenAI, Evolution API, Hub N8n Secret)
2. Criar Data Table `pedido_em_aberto`
3. Criar e ativar Fluxo 4 (Follow-up Cron) — independente
4. Criar e ativar Fluxo 5 (Notificação de Preço) — independente
5. Criar e ativar Fluxo 3 (Handoff para Humano) — dependência dos Fluxos 1 e 2
6. Criar e ativar Fluxo 2 (Fechamento de Pedido) — dependência do Fluxo 1
7. Criar e ativar Fluxo 1 (Atendimento Principal) — ponto de entrada principal

---

## Arquivos de Workflow a Exportar

Após criação, exportar cada workflow como JSON para `n8n/workflows/`:
- `01-atendimento-principal.json`
- `02-fechamento-pedido.json`
- `03-handoff-humano.json`
- `04-followup-cron.json`
- `05-notificacao-preco.json`
