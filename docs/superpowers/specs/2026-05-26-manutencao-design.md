# Setor de Manutenção — Design Spec

**Data:** 2026-05-26
**Projeto:** AI Retail Automation Hub
**Escopo:** Monitoramento de erros com agente IA autônomo + rastreamento de tokens OpenAI

---

## 1. Visão Geral

O Setor de Manutenção é um sistema embutido no Hub que:

1. Detecta erros em todas as camadas (n8n + Next.js)
2. Aciona um agente de IA (Claude Sonnet) que tenta resolver automaticamente com até 3 estratégias
3. Notifica o desenvolvedor por WhatsApp apenas se o agente não conseguir resolver
4. Rastreia consumo de tokens OpenAI por workflow/rota e envia relatório diário às 08h
5. Expõe painel restrito ao desenvolvedor em `/crm/manutencao`

---

## 2. Arquitetura

```
Erro detectado (n8n ou Next.js)
      │
      ▼
POST /api/manutencao/erros
      │
      ▼
[Agente IA — Claude Sonnet com tool use]
      │  analisa erro + histórico Supabase
      │
      ├─ tenta até 3 estratégias sequenciais
      │  verifica resolução após cada uma
      │
      ├─ Resolvido → registra status "resolvido_ia", silêncio
      │
      └─ Não resolvido → WhatsApp ao dev com diagnóstico + link

Chamada OpenAI (qualquer origem)
      │
      ├─ Next.js: middleware de logging
      └─ n8n: nó "Log Tokens" após cada LLM
             └──► POST /api/manutencao/tokens → Supabase

Fluxo 10 Cron (08h diário)
      │
      └──► consulta /api/manutencao/tokens/resumo
           envia WhatsApp ao dev com consumo: 24h / semana / mês
```

---

## 3. Banco de Dados (Supabase)

### Tabela `manutencao_erros`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid PK | Identificador único |
| created_at | timestamptz | Quando o erro ocorreu |
| source | text | `'n8n'` ou `'nextjs'` |
| workflow_name | text | Ex: `'Fluxo 1 — Atendimento Principal'` |
| node_name | text | Nó específico que falhou (n8n) |
| route | text | Rota Next.js que falhou |
| error_message | text | Mensagem de erro |
| error_stack | text | Stack trace completo |
| context | jsonb | Payload que causou o erro |
| status | text | `'pendente'` / `'resolvido_ia'` / `'resolvido_dev'` / `'sem_solucao'` |
| diagnostico_ia | text | Explicação gerada pelo agente em PT-BR |
| tentativas_ia | jsonb | Lista de ações tentadas + resultado de cada uma |
| resolved_at | timestamptz | Quando foi resolvido |

### Tabela `manutencao_tokens`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid PK | Identificador único |
| created_at | timestamptz | Quando a chamada foi feita |
| source | text | Ex: `'Fluxo 1'`, `'/api/webhooks/whatsapp'` |
| model | text | Ex: `'gpt-4o'`, `'gpt-4o-mini'` |
| prompt_tokens | int | Tokens de entrada |
| completion_tokens | int | Tokens de saída |
| total_tokens | int | Total da chamada |
| custo_usd | numeric(10,6) | Custo calculado no registro usando tabela de preços hardcoded: gpt-4o = $0.000005/token input + $0.000015/token output; gpt-4o-mini = $0.00000015/token input + $0.0000006/token output |

---

## 4. Ferramentas do Agente de IA

O agente usa Claude Sonnet via Anthropic SDK com tool use. Cada ferramenta tem uma implementação real.

| Ferramenta | Parâmetros | O que faz |
|---|---|---|
| `restart_workflow` | `workflow_id: string` | Chama API do n8n para reativar workflow desabilitado |
| `retry_execution` | `execution_id: string` | Re-executa última execução falha via API n8n |
| `clear_redis_cache` | `pattern: string` | Limpa chaves Redis por padrão (ex: `session:*`) |
| `check_service_status` | `service: string` | Testa conectividade: OpenAI / Supabase / Redis / Meta API |
| `reconnect_credential` | `credential_id: string` | Atualiza credencial expirada no n8n via API |
| `log_diagnostico` | `mensagem: string` | Persiste passo do raciocínio em `tentativas_ia` |
| `notify_developer` | `mensagem: string` | Envia WhatsApp ao dev — só acionada após esgotar tentativas |

### Estratégia de Retry do Agente

1. **Tentativa 1:** ação imediata (ex: retry_execution)
2. **Tentativa 2:** ação alternativa após 30s (ex: clear_redis_cache + retry)
3. **Tentativa 3:** ação de último recurso após 90s (ex: restart_workflow)
4. Se todas falharem → `notify_developer`

---

## 5. API Routes (Next.js)

| Rota | Método | Descrição |
|---|---|---|
| `/api/manutencao/erros` | POST | Recebe erro do n8n ou de rotas internas, aciona agente |
| `/api/manutencao/tokens` | POST | Registra consumo de tokens de uma chamada OpenAI |
| `/api/manutencao/tokens/resumo` | GET | Retorna agregados por período (query: `period=24h/7d/10d/15d/30d`) |
| `/api/manutencao/erros/[id]/resolver` | POST | Marca erro como `resolvido_dev` |

Todas as rotas são protegidas por autenticação (mesma sessão do CRM, papel `admin`/`dev`).

---

## 6. n8n — Novos Workflows

### Error Workflow Global (configuração do n8n)
- Configurado como `Error Workflow` nas Settings do n8n
- Captura falhas de qualquer workflow
- **Camada 1 — retry simples n8n:** tenta re-executar 1x imediatamente e 1x após 30s (sem agente)
- Se ambos falharem: POST `/api/manutencao/erros` com contexto completo → agente assume
- **Camada 2 — agente IA:** o agente usa estratégias inteligentes (ver seção 4). As duas camadas são sequenciais e não se sobrepõem.

### Fluxo 10 — Cron Relatório Diário
- **Trigger:** Schedule — 08h00, todos os dias
- **Ação:** GET `/api/manutencao/tokens/resumo?period=24h,7d,30d`
- **Formata** mensagem WhatsApp com consumo e status de erros
- **Envia** via Meta Graph API para número do desenvolvedor

### Nó "Log Tokens" (inserido em Fluxos 1, 2, 3)
- Após cada nó de chamada LLM, um HTTP Request POST para `/api/manutencao/tokens`
- Extrai `usage.prompt_tokens`, `usage.completion_tokens`, `usage.total_tokens` da resposta OpenAI

---

## 7. Página de Manutenção (`/crm/manutencao`)

**Acesso:** restrito ao desenvolvedor (papel `admin`/`dev` via middleware RBAC existente)

### Tab 1 — Erros

- Tabela com colunas: Workflow, Quando, Status, Ações
- Status com badge colorido: 🔴 Sem solução / 🟡 IA tentando / 🟢 Resolvido pela IA / ✅ Resolvido pelo dev
- Filtros: por status, por fonte (n8n/nextjs), por período
- Expandir linha: exibe diagnóstico da IA, lista de tentativas, contexto JSON, botão "Marcar como resolvido"

### Tab 2 — Tokens OpenAI

- Seletor de período: 1h / 24h / 7d / 10d / 15d / 30d
- Cards de resumo: total de tokens, custo total, número de chamadas
- Gráfico de barras: consumo diário ao longo do período
- Tabela de breakdown: por workflow/rota, tokens, custo, chamadas

---

## 8. Formato do Relatório Diário (WhatsApp)

```
🛠️ *Relatório de Manutenção — DD/MM*

*Sistema:* ✅ Tudo operacional  (ou ⚠️ X erros pendentes)

*Tokens OpenAI:*
• Últimas 24h: X.XXX tokens — US$ 0,0XX
• Semana:      XX.XXX tokens — US$ 0,XX
• Mês:        XXX.XXX tokens — US$ X,XX

*Erros nas últimas 24h:*
• ✅ N resolvidos automaticamente pela IA
• ⚠️ N pendentes para você

→ hub.com/crm/manutencao
```

---

## 9. Fora do Escopo

- Monitoramento de infraestrutura de servidor (CPU, memória, disco) — isso é responsabilidade do provedor de hospedagem
- Auto-deploy ou rollback de código pelo agente
- Acesso do cliente ao painel de manutenção
- Alertas de SLA ou uptime (ex: resposta em X segundos)

---

## 10. Dependências

- Anthropic SDK (`@anthropic-ai/sdk`) — para o agente Claude Sonnet
- n8n API (já disponível internamente) — para `restart_workflow` e `retry_execution`
- Redis client (já integrado) — para `clear_redis_cache`
- Meta Graph API (já integrada) — para notificações WhatsApp
- Supabase (já integrado) — para persistência
