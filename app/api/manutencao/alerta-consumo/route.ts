import { NextResponse } from "next/server";

// Limites de referência configurados pelo desenvolvedor
const LIMITE_DIARIO_USD = 0.19;
const ALERTA_PERCENTUAL = 0.80; // 80%
const ALERTA_THRESHOLD = LIMITE_DIARIO_USD * ALERTA_PERCENTUAL; // $0.152

const DEV_WHATSAPP = process.env.DEV_WHATSAPP ?? "5513988647356";
const EVOLUTION_URL = process.env.EVOLUTION_API_URL ?? "https://evo.evoapi.shop";
// Sem fallback hardcoded — chave só via env (repo é público)
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY ?? "";
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE ?? "Araujo";

async function buscarCustoHoje(): Promise<number> {
  const apiKey = process.env.OPENAI_ADMIN_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) return 0;

  const agora = new Date();
  const inicioHoje = new Date(agora);
  inicioHoje.setHours(0, 0, 0, 0);

  const url = new URL("https://api.openai.com/v1/organization/usage/completions");
  url.searchParams.set("start_time", String(Math.floor(inicioHoje.getTime() / 1000)));
  url.searchParams.set("end_time", String(Math.floor(agora.getTime() / 1000)));
  url.searchParams.set("bucket_width", "1d");
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });

  if (!res.ok) return 0;

  const PRECOS: Record<string, { input: number; output: number }> = {
    "gpt-4o":        { input: 0.000005,   output: 0.000015 },
    "gpt-4o-mini":   { input: 0.00000015, output: 0.0000006 },
    "gpt-4-turbo":   { input: 0.00001,    output: 0.00003 },
    "gpt-3.5-turbo": { input: 0.0000005,  output: 0.0000015 },
  };

  type BucketResult = { input_tokens: number; output_tokens: number; model_ids?: string[] };
  type Bucket = { results: BucketResult[] };
  const data = await res.json() as { data?: Bucket[] };
  const buckets = data.data ?? [];

  let total = 0;
  for (const bucket of buckets) {
    for (const r of bucket.results) {
      const modelo = (r.model_ids?.[0] ?? "gpt-4o-mini").toLowerCase();
      const key = Object.keys(PRECOS).find((k) => modelo.includes(k)) ?? "gpt-4o-mini";
      const p = PRECOS[key];
      total += (r.input_tokens ?? 0) * p.input + (r.output_tokens ?? 0) * p.output;
    }
  }

  return total;
}

async function enviarAlertaWhatsApp(custoHoje: number): Promise<void> {
  if (!EVOLUTION_KEY) return;

  const percentual = Math.round((custoHoje / LIMITE_DIARIO_USD) * 100);
  const restante = LIMITE_DIARIO_USD - custoHoje;

  const texto =
    `⚠️ *Alerta de Consumo OpenAI*\n\n` +
    `Você atingiu *${percentual}%* do limite diário de US$ ${LIMITE_DIARIO_USD.toFixed(2)}.\n\n` +
    `📊 Consumido hoje: *US$ ${custoHoje.toFixed(4)}*\n` +
    `💰 Restante: US$ ${restante.toFixed(4)}\n` +
    `📅 Limite diário: US$ ${LIMITE_DIARIO_USD.toFixed(2)}\n\n` +
    `Acesse Manutenção → Tokens OpenAI para detalhes.`;

  const url = `${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
    body: JSON.stringify({ number: DEV_WHATSAPP, text: texto }),
  });
}

// Cron: GET /api/manutencao/alerta-consumo
// Também pode ser chamado manualmente para testar
export async function GET() {
  try {
    const custoHoje = await buscarCustoHoje();
    const percentual = custoHoje / LIMITE_DIARIO_USD;
    const disparou = custoHoje >= ALERTA_THRESHOLD;

    if (disparou) {
      await enviarAlertaWhatsApp(custoHoje);
    }

    return NextResponse.json({
      custoHoje,
      limiteDiario: LIMITE_DIARIO_USD,
      percentual: Math.round(percentual * 100),
      threshold: ALERTA_THRESHOLD,
      alertaDisparado: disparou,
    });
  } catch (err) {
    console.error("[alerta-consumo]", err);
    return NextResponse.json({ error: "Erro ao verificar consumo" }, { status: 500 });
  }
}
