# N8n Flows — Araujo Hub (M7)

Documentação de todos os workflows de automação com IA configurados no N8n.

---

## Visão Geral dos Fluxos

```
WhatsApp / Instagram
        │
        ▼
  /api/webhooks/whatsapp|instagram   (Hub Next.js)
        │  upsert cliente + log
        ▼
[Fluxo 1] Atendimento Principal   ◄── GPT-4o analisa intenção
        │
        ├─ saudacao / consulta_preco ──► Responde via Meta Graph API
        │
        ├─ fazer_pedido ──────────────► [Fluxo 2] Fechamento de Pedido
        │                                    │
        │                                    ▼
        │                             GPT-4o coleta itens,
        │                             endereço, pagamento
        │                                    │
        │                             pedido_completo = true
        │                                    │
        │                                    ▼
        │                             POST /api/webhooks/n8n
        │                             tipo: pedido_confirmado
        │
        └─ humano ────────────────────► [Fluxo 3] Handoff para Humano
                                             │
                                             ▼
                                       POST /api/webhooks/n8n
                                       tipo: ambiguo | sem_resposta
                                       + avisa cliente no WhatsApp

[Fluxo 4] Follow-up Cron
  Schedule: 09h Seg-Sáb
        │
        ▼
  POST /api/followup  (com x-cron-secret)
        │
        └─ Log Sucesso / Log Erro

[Fluxo 5] Notificação de Preço
  Trigger: POST /webhook/notificacao-preco  (chamado pelo Hub após aprovar preço)
        │
        ▼
  Envia WhatsApp ao solicitante: "✅ Preço de [produto] atualizado para R$ X"
```

---

## Arquivos dos Workflows

| Arquivo | Workflow | Trigger |
|---------|----------|---------|
| [`n8n/workflows/01-atendimento-principal.json`](../n8n/workflows/01-atendimento-principal.json) | Atendimento Principal | Webhook POST |
| [`n8n/workflows/02-fechamento-pedido.json`](../n8n/workflows/02-fechamento-pedido.json) | Fechamento de Pedido | Webhook POST |
| [`n8n/workflows/03-handoff-humano.json`](../n8n/workflows/03-handoff-humano.json) | Handoff para Humano | Webhook POST |
| [`n8n/workflows/04-followup-cron.json`](../n8n/workflows/04-followup-cron.json) | Follow-up Cron | Schedule (09h Seg-Sáb) |
| [`n8n/workflows/05-notificacao-preco.json`](../n8n/workflows/05-notificacao-preco.json) | Notificação de Preço | Webhook POST |

---

## Fluxo 1 — Atendimento Principal

**Arquivo:** `01-atendimento-principal.json`

**Trigger:** `POST /webhook/atendimento-entrada`

O Hub chama este endpoint após receber e registrar uma mensagem de WhatsApp/Instagram. Também usado pelo follow-up cron — nesse caso, o payload inclui `tipo: "follow_up"` e a mensagem é enviada diretamente, sem passar pela IA.

### Nós

```
Webhook Trigger
    │
    ▼
Normalizar Payload
    │
    ▼
Follow-up ou Atendimento? (Switch)
    │
    ├─ tipo=follow_up ──► Enviar Follow-up WhatsApp (Evolution API)
    │                          │
    │                          └──► Respond OK
    │
    └─ outros ──► Buscar Cliente (Supabase REST)
                       GET /rest/v1/clientes?telefone=eq.{telefone}
                  ──► Buscar Catálogo (Hub REST)
                       GET /api/produtos
                   │
                   ▼
            Montar Contexto (Set)
                   │
                   ▼
         IA Atendimento (GPT-4o)
         System prompt com: identidade da loja, catálogo, etapa do cliente
         Retorna: { resposta, intencao }
                   │
                   ▼
           Parse Resposta IA
                   │
                   ▼
           Switch Intenção
                   │
        ┌──────────┼──────────────┐
        ▼          ▼              ▼
  fazer_pedido   humano    outros (saudacao,
        │          │        consulta_preco,
        │          │        fora_escopo)
        │          │              │
  [Fluxo 2]  Handoff       Enviar WhatsApp
              Humano→Hub    (Meta Graph API)
```

### Payload de entrada esperado

```json
{
  "telefone": "5511999999999",
  "mensagem": "Olá, quero saber o preço da picanha",
  "canal": "whatsapp",
  "nome_cliente": "João Silva"
}
```

### Intenções classificadas pela IA

| Intenção | Significado | Ação |
|----------|-------------|------|
| `saudacao` | Cumprimento inicial | Responde normalmente |
| `consulta_preco` | Pergunta sobre preços/produtos | Responde com catálogo |
| `fazer_pedido` | Quer comprar | Aciona Fluxo 2 |
| `fora_escopo` | Assunto não relacionado | Responde com aviso |
| `humano` | Pede atendente / situação complexa | Aciona Fluxo 3 |

---

## Fluxo 2 — Fechamento de Pedido

**Arquivo:** `02-fechamento-pedido.json`

**Trigger:** `POST /webhook/fechamento-pedido`

Acionado pelo Fluxo 1 quando `intencao = "fazer_pedido"`. Conduz a coleta estruturada via GPT-4o com múltiplos turnos.

### Nós

```
Webhook Pedido
    │
    ▼
Buscar Produtos (Supabase REST — com IDs)
    │
    ▼
IA Coleta de Pedido (GPT-4o)
  Analisa: mensagem + histórico + dados_parciais
  Coleta: itens, endereço, forma_pagamento, observações
  Retorna: { resposta, pedido_completo, dados_coletados }
    │
    ▼
Parse Pedido IA
    │
    ▼
Pedido Completo?
    │
    ├─ SIM ──► Confirmar Pedido → Hub
    │          POST /api/webhooks/n8n
    │          tipo: pedido_confirmado
    │          (HandoffPayload completo com itens e endereço)
    │
    └─ NÃO ──► Enviar Mensagem WhatsApp
               (solicita próximo dado faltante)
```

### Payload de entrada esperado

```json
{
  "telefone": "5511999999999",
  "nome_cliente": "João Silva",
  "canal": "whatsapp",
  "mensagem": "Quero 2kg de picanha e 1kg de frango",
  "historico": ["Olá, quero fazer um pedido"],
  "dados_parciais": {}
}
```

### Dados coletados para fechar pedido

| Campo | Obrigatório | Exemplo |
|-------|-------------|---------|
| `itens_pedido` | Sim | `[{ produto_id, nome, quantidade, preco_unitario }]` |
| `endereco_entrega` | Sim | `"Rua das Flores, 123 - Centro"` |
| `forma_pagamento` | Sim | `"pix"` / `"dinheiro"` / `"cartao_credito"` |
| `observacoes` | Não | `"Sem cebola"` |

---

## Fluxo 3 — Handoff para Humano

**Arquivo:** `03-handoff-humano.json`

**Trigger:** `POST /webhook/handoff-humano`

Acionado quando o Fluxo 1 detecta `intencao = "humano"` ou quando o Fluxo 2 atinge o limite de turnos sem completar o pedido.

### Nós

```
Webhook Handoff
    │
    ▼
Tipo sem_resposta?
    │
    ├─ SIM ──► Hub → sem_resposta (follow_up)
    │          POST /api/webhooks/n8n
    │          tipo: sem_resposta → etapa: follow_up
    │
    └─ NÃO ──► Hub → ambiguo (atendimento)
               POST /api/webhooks/n8n
               tipo: ambiguo → etapa: atendimento
    │
    ▼ (ambos convergem)
Avisar Cliente (WhatsApp)
  "Aguarde, um atendente irá continuar o seu atendimento em breve. 😊"
```

### Payload de entrada esperado

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

---

## Fluxo 4 — Follow-up Cron

**Arquivo:** `04-followup-cron.json`

**Trigger:** Schedule — `0 9 * * 1-6` (09h00 de segunda a sábado, horário de Brasília)

Chama o endpoint de follow-up do Hub diariamente para processar clientes inativos.

### Nós

```
Schedule Trigger (09h Seg-Sáb)
    │
    ▼
Chamar /api/followup
  POST {HUB_URL}/api/followup
  Header: x-cron-secret: {CRON_SECRET}
    │
    ▼
Sucesso?
    ├─ SIM ──► Log Sucesso (com contador de processados)
    └─ NÃO ──► Log Erro (com statusCode)
```

### O que o Hub faz ao receber `/api/followup`

1. Lista clientes em etapa `follow_up` com mais de X dias sem atualização
2. Dispara mensagem de reativação via N8n (webhook de saída)
3. Registra tentativa em `logs`
4. Move para `marketing` após N tentativas sem resposta

### Configuração de dias e tentativas

Ajustável em `app/(crm)/configuracoes/page.tsx` → aba Follow-up.

---

## Fluxo 5 — Notificação de Preço Aprovado

**Arquivo:** `05-notificacao-preco.json`

**Trigger:** `POST /webhook/notificacao-preco`

Chamado pelo Hub (`lib/n8n/client.ts`) imediatamente após um admin aprovar uma atualização de preço em `/crm/precos`.

### Nós

```
Webhook Preço
    │
    ▼
Montar Mensagem
  "✅ Preço de {produto} atualizado para R$ {valor} e já está ativo no sistema."
    │
    ▼
Tem Telefone?
    ├─ SIM ──► Enviar Confirmação WhatsApp
    │          (para o número do solicitante)
    └─ NÃO ──► Skip (log interno)
    │
    ▼
Resposta OK
```

### Payload de entrada esperado

```json
{
  "tipo": "atualizacao_preco",
  "produto_nome": "Picanha",
  "preco_novo": 95.90,
  "solicitado_por": "5511999999999"
}
```

O campo `solicitado_por` deve ser o número de telefone WhatsApp do colaborador que enviou a atualização.

---

## Variáveis de Ambiente no N8n

Configure em **Settings → Environment Variables** no painel do N8n:

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `HUB_URL` | URL base do Hub em produção | `https://araujo-hub.vercel.app` |
| `SUPABASE_URL` | URL do projeto Supabase | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key do Supabase | `eyJ...` |
| `N8N_WEBHOOK_SECRET` | Secret compartilhado com o Hub | `meu-secret-seguro` |
| `WHATSAPP_TOKEN` | Bearer token da Meta Graph API | `EAAx...` |
| `WHATSAPP_PHONE_NUMBER_ID` | ID do número WhatsApp Business | `123456789` |
| `INSTAGRAM_PAGE_ID` | ID da página Instagram | `987654321` |
| `CRON_SECRET` | Secret para o endpoint `/api/followup` | `cron-secret-seguro` |

---

## Credenciais no N8n

Configure em **Credentials** no painel do N8n:

### OpenAI
- **Tipo:** OpenAI API
- **Nome:** `OpenAI`
- **API Key:** valor de `OPENAI_API_KEY`
- Usado pelos Fluxos 1 e 2

### HTTP Header Auth — Hub Secret
- **Tipo:** HTTP Header Auth
- **Nome:** `Hub N8n Secret`
- **Header:** `x-n8n-secret`
- **Value:** valor de `N8N_WEBHOOK_SECRET`
- Usado para autenticar chamadas recebidas do Hub

### HTTP Header Auth — Meta Graph API
- **Tipo:** HTTP Header Auth
- **Nome:** `Meta Graph API`
- **Header:** `Authorization`
- **Value:** `Bearer {WHATSAPP_TOKEN}`
- Usado para enviar mensagens WhatsApp/Instagram

---

## Como Importar os Workflows

1. Abra o painel do N8n (`http://localhost:5678` ou sua URL de produção)
2. Clique em **Workflows** no menu lateral
3. Clique em **+ New** → **Import from file**
4. Selecione o arquivo `.json` em `n8n/workflows/`
5. Repita para cada workflow
6. Configure as credenciais conforme a seção acima
7. Ative cada workflow com o toggle no canto superior direito

### Ordem de ativação recomendada

1. `04-followup-cron.json` — independente, pode ativar primeiro
2. `05-notificacao-preco.json` — independente
3. `03-handoff-humano.json` — usado pelos outros dois
4. `02-fechamento-pedido.json` — acionado pelo Fluxo 1
5. `01-atendimento-principal.json` — ativar por último (ponto de entrada principal)

---

## URLs dos Webhooks N8n (produção — M7)

Workflows ativos na instância `https://n8n.evoapi.shop`:

| Workflow | ID | Webhook URL |
| -------- | -- | ----------- |
| Fluxo 1 — Atendimento Principal | `igjfXgJa6zYvQz1u` | `https://n8n.evoapi.shop/webhook/atendimento-entrada` |
| Fluxo 2 — Fechamento de Pedido | `fmYqq9lCHX6hgQzv` | `https://n8n.evoapi.shop/webhook/fechamento-pedido` |
| Fluxo 3 — Handoff para Humano | `ayAye8I7ms0CaNGq` | `https://n8n.evoapi.shop/webhook/handoff-humano` |
| Fluxo 4 — Follow-up Cron | `zoEv7n7Vrn3H7rAj` | Schedule (09h Seg-Sáb) |
| Fluxo 5 — Notificação de Preço | `Zlx5Uh93mdKRBbnv` | `https://n8n.evoapi.shop/webhook/notificacao-preco` |

Configure no `.env.local` do Hub:
```env
N8N_WEBHOOK_ATENDIMENTO_URL=https://n8n.evoapi.shop/webhook/atendimento-entrada
N8N_WEBHOOK_HANDOFF_URL=https://n8n.evoapi.shop/webhook/handoff-humano
N8N_WEBHOOK_PRICE_UPDATE_URL=https://n8n.evoapi.shop/webhook/notificacao-preco
N8N_WEBHOOK_FOLLOW_UP_URL=https://n8n.evoapi.shop/webhook/envio-direto-whatsapp
```

---

## Integração Hub → N8n (Webhooks de Saída)

O Hub dispara eventos para o N8n usando `lib/n8n/client.ts`:

```typescript
import { dispararWebhookN8n } from "@/lib/n8n/client";

// Ao receber mensagem do WhatsApp → acionar atendimento
await dispararWebhookN8n("atendimento", {
  telefone: "5511999999999",
  mensagem: "Olá, quero um pedido",
  canal: "whatsapp",
  nome_cliente: "João Silva",
});

// Ao aprovar preço → notificar solicitante
await dispararWebhookN8n("preco", {
  tipo: "atualizacao_preco",
  produto_nome: "Picanha",
  preco_novo: 95.90,
  solicitado_por: "5511999999999",
});
```

---

## Testes Locais com ngrok

Para testar os webhooks localmente antes do deploy:

```bash
# Terminal 1 — Hub rodando
npm run dev

# Terminal 2 — ngrok expondo o Hub
ngrok http 3000

# Terminal 3 — N8n rodando (Docker)
docker run -it --rm \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

No N8n, use a URL do ngrok como `HUB_URL` para testes.
