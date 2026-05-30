type N8nWebhookName = "atendimento" | "handoff" | "price-update" | "follow-up" | "notificacao-etapa";

const WEBHOOK_URLS: Record<N8nWebhookName, string | undefined> = {
  atendimento: process.env.N8N_WEBHOOK_ATENDIMENTO_URL,
  handoff: process.env.N8N_WEBHOOK_HANDOFF_URL,
  "price-update": process.env.N8N_WEBHOOK_PRICE_UPDATE_URL,
  "follow-up": process.env.N8N_WEBHOOK_FOLLOW_UP_URL,
  "notificacao-etapa": process.env.N8N_WEBHOOK_NOTIFICACAO_ETAPA_URL,
};

export async function dispararWebhookN8n<T>(
  nome: N8nWebhookName,
  payload: T
): Promise<void> {
  const url = WEBHOOK_URLS[nome];
  if (!url) {
    console.error(`[n8n] URL não configurada para webhook: ${nome}`);
    return;
  }

  const secret = process.env.N8N_WEBHOOK_SECRET;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (secret) headers["x-n8n-secret"] = secret;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error(`[n8n] Webhook ${nome} falhou: ${res.status} ${res.statusText}`);
  }
}
