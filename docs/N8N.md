# Integração N8n — Araujo Hub

## Visão Geral do Fluxo

```
WhatsApp / Instagram
        │
        ▼
  Meta Webhook API
        │
        ▼
  /api/webhooks/whatsapp    /api/webhooks/instagram
        │                           │
        └──────────┬────────────────┘
                   ▼
          upsert cliente (DB)
          registrar log (DB)
                   │
                   ▼ (evento disparado via N8n)
          N8n processa conversa
                   │
                   ▼
     /api/webhooks/n8n  ◄── HandoffPayload
                   │
                   ▼
       regras de handoff
                   │
        ┌──────────┼──────────────┬──────────────┐
        ▼          ▼              ▼              ▼
   ambiguo  pedido_confirmado  separacao    sem_resposta
      │            │            completa        │
      ▼            ▼              │             ▼
atendimento  pedido_gerado        ▼          follow_up
             + cria pedido    em_rota
```

---

## Variáveis de Ambiente Necessárias

| Variável | Descrição |
|----------|-----------|
| `WHATSAPP_TOKEN` | Token HMAC para validar assinatura dos payloads Meta |
| `WHATSAPP_VERIFY_TOKEN` | Token de verificação do desafio GET do Meta |
| `INSTAGRAM_TOKEN` | Token de verificação do Instagram |
| `N8N_WEBHOOK_SECRET` | Secret compartilhado entre N8n e a API (header `x-n8n-secret`) |
| `N8N_WEBHOOK_HANDOFF_URL` | URL de saída do N8n para handoffs |
| `N8N_WEBHOOK_PRICE_UPDATE_URL` | URL de saída do N8n para atualizações de preço |
| `N8N_WEBHOOK_FOLLOW_UP_URL` | URL de saída do N8n para follow-up |
| `RESEND_API_KEY` | Chave da API Resend para e-mails de notificação |

---

## Endpoints

### `GET /api/webhooks/whatsapp`
Verificação de token pelo Meta.

**Query params:**
- `hub.mode=subscribe`
- `hub.verify_token=<WHATSAPP_VERIFY_TOKEN>`
- `hub.challenge=<string>`

**Resposta:** retorna o valor de `hub.challenge` com status 200.

---

### `POST /api/webhooks/whatsapp`
Recebe mensagens do WhatsApp Business API.

**Headers obrigatórios:**
- `x-hub-signature-256: sha256=<hmac>` — calculado com `WHATSAPP_TOKEN`

**Exemplo de payload (Meta):**
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "ENTRY_ID",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": { "display_phone_number": "55119...", "phone_number_id": "..." },
        "contacts": [{ "profile": { "name": "João Silva" }, "wa_id": "5511999999999" }],
        "messages": [{
          "from": "5511999999999",
          "id": "wamid.xxx",
          "timestamp": "1700000000",
          "type": "text",
          "text": { "body": "Olá, quero fazer um pedido" }
        }]
      },
      "field": "messages"
    }]
  }]
}
```

**Teste com curl:**
```bash
# Gerar assinatura
BODY='{"object":"whatsapp_business_account","entry":[]}'
SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$WHATSAPP_TOKEN" | awk '{print "sha256="$2}')

curl -X POST http://localhost:3000/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: $SIG" \
  -d "$BODY"
```

---

### `GET /api/webhooks/instagram`
Verificação de token pelo Meta (mesmo padrão do WhatsApp, usa `INSTAGRAM_TOKEN`).

---

### `POST /api/webhooks/instagram`
Recebe mensagens do Instagram Messaging.

**Exemplo de payload:**
```json
{
  "object": "instagram",
  "entry": [{
    "id": "PAGE_ID",
    "time": 1700000000,
    "messaging": [{
      "sender": { "id": "USER_SCOPED_ID" },
      "recipient": { "id": "PAGE_ID" },
      "timestamp": 1700000000,
      "message": { "mid": "mid.xxx", "text": "Quero um pedido" }
    }]
  }]
}
```

---

### `POST /api/webhooks/n8n`
Recebe handoffs processados pelo N8n.

**Headers obrigatórios:**
- `x-n8n-secret: <N8N_WEBHOOK_SECRET>`

**Body:**
```json
{
  "tipo": "pedido_confirmado",
  "atendente_email": "atendente@loja.com",
  "handoff": {
    "nome": "João Silva",
    "telefone": "5511999999999",
    "canal_origem": "whatsapp",
    "etapa": "pedido_gerado",
    "ultimas_mensagens": ["Quero 2kg de picanha", "Endereço: Rua X, 123"],
    "itens_pedido": [
      { "produto_id": "uuid", "nome": "Picanha", "quantidade": 2, "preco_unitario": 89.90 }
    ],
    "proxima_acao": "Preparar pedido para separação"
  }
}
```

**Tipos de handoff e etapas resultantes:**

| `tipo` | Etapa resultante | Ação extra |
|--------|-----------------|------------|
| `ambiguo` | `atendimento` | — |
| `pedido_confirmado` | `pedido_gerado` | Cria registro em `pedidos` |
| `separacao_completa` | `em_rota` | — |
| `sem_resposta` | `follow_up` | — |

**Resposta para `pedido_confirmado`:** quando o pedido é criado, o Hub retorna `pedido_id` e
`numero_pedido` para o N8n usar na confirmação ao cliente.

```json
{
  "ok": true,
  "cliente_id": "uuid",
  "pedido_id": "uuid",
  "numero_pedido": 1
}
```

**Notificação por e-mail:** disparada via Resend para `atendente_email` quando `tipo` é `pedido_confirmado` ou `sem_resposta`.

**Teste com curl:**
```bash
curl -X POST http://localhost:3000/api/webhooks/n8n \
  -H "Content-Type: application/json" \
  -H "x-n8n-secret: $N8N_WEBHOOK_SECRET" \
  -d '{
    "tipo": "pedido_confirmado",
    "atendente_email": "atendente@loja.com",
    "handoff": {
      "nome": "Maria Souza",
      "telefone": "5511988887777",
      "canal_origem": "whatsapp",
      "etapa": "pedido_gerado",
      "ultimas_mensagens": ["Quero 1kg de frango"],
      "itens_pedido": [
        { "produto_id": "00000000-0000-0000-0000-000000000001", "nome": "Frango", "quantidade": 1, "preco_unitario": 18.50 }
      ],
      "proxima_acao": "Separar pedido"
    }
  }'
```

---

## Webhooks de Saída (N8n ← Hub)

O Hub pode disparar eventos para o N8n usando `lib/n8n/client.ts`:

```typescript
import { dispararWebhookN8n } from "@/lib/n8n/client";
import { buildHandoffPayload } from "@/lib/n8n/payloads";

await dispararWebhookN8n("handoff", buildHandoffPayload({
  nome: "João",
  telefone: "5511999999999",
  canal_origem: "whatsapp",
  etapa: "atendimento",
  proxima_acao: "Confirmar pedido com cliente",
}));
```

Webhooks de saída configuráveis:
- `N8N_WEBHOOK_HANDOFF_URL` — acionado ao mover cliente para etapa via CRM
- `N8N_WEBHOOK_PRICE_UPDATE_URL` — acionado ao aprovar atualização de preço
- `N8N_WEBHOOK_FOLLOW_UP_URL` — acionado pelo cron de follow-up (M5)
