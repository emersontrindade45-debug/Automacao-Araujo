import { NextRequest, NextResponse } from "next/server";

const PRECOS: Record<string, { input: number; output: number }> = {
  "gpt-4o":              { input: 0.000005,    output: 0.000015 },
  "gpt-4o-mini":         { input: 0.00000015,  output: 0.0000006 },
  "gpt-4-turbo":         { input: 0.00001,     output: 0.00003 },
  "gpt-3.5-turbo":       { input: 0.0000005,   output: 0.0000015 },
  "text-embedding-ada-002":  { input: 0.0000001,  output: 0 },
  "text-embedding-3-small":  { input: 0.00000002, output: 0 },
  "text-embedding-3-large":  { input: 0.00000013, output: 0 },
};

function calcularCusto(model: string, input: number, output: number): number {
  const key = Object.keys(PRECOS).find((k) => model.toLowerCase().includes(k)) ?? "gpt-4o-mini";
  const p = PRECOS[key];
  return input * p.input + output * p.output;
}

function periodoParaDatas(period: string): { startTs: number; endTs: number; start: string; end: string } {
  const agora = new Date();
  const fim = new Date(agora);
  fim.setHours(23, 59, 59, 999);

  const inicio = new Date(agora);
  inicio.setHours(0, 0, 0, 0);

  // Suporta Xd (dias) e Xm (meses)
  if (period.endsWith("m")) {
    const meses = Math.min(parseInt(period) || 1, 12);
    inicio.setMonth(inicio.getMonth() - meses);
  } else {
    const dias = Math.min(parseInt(period) || 7, 365);
    inicio.setDate(inicio.getDate() - (dias - 1));
  }

  const fmtDate = (d: Date) => d.toISOString().split("T")[0];

  return {
    startTs: Math.floor(inicio.getTime() / 1000),
    endTs: Math.floor(fim.getTime() / 1000),
    start: fmtDate(inicio),
    end: fmtDate(agora),
  };
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.OPENAI_ADMIN_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_ADMIN_KEY não configurada" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "7d";
  const { startTs, endTs, start, end } = periodoParaDatas(period);

  // OpenAI Usage API v2 — disponível com sk-proj- keys normais
  const url = new URL("https://api.openai.com/v1/organization/usage/completions");
  url.searchParams.set("start_time", String(startTs));
  url.searchParams.set("end_time", String(endTs));
  url.searchParams.set("bucket_width", "1d");
  url.searchParams.set("limit", "31");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const erro = await res.text();
    console.error("[openai-usage] erro API:", res.status, erro);

    // Fallback: retorna estrutura vazia com mensagem amigável
    return NextResponse.json({
      period,
      start,
      end,
      total_tokens: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_requests: 0,
      total_custo_usd: 0,
      por_dia: [],
      por_modelo: {},
      aviso: `API OpenAI retornou ${res.status}. Verifique se a chave tem permissão de leitura de uso (Organization API key).`,
    });
  }

  type BucketResult = {
    input_tokens: number;
    output_tokens: number;
    num_model_requests: number;
    model_ids?: string[];
  };

  type Bucket = {
    start_time: number;
    end_time: number;
    results: BucketResult[];
  };

  const data = await res.json() as { data?: Bucket[]; object?: string };
  const buckets: Bucket[] = data.data ?? [];

  const porDia: Record<string, { input: number; output: number; requests: number; custo: number }> = {};
  const porModelo: Record<string, { input: number; output: number; requests: number; custo: number }> = {};

  let totalInput = 0;
  let totalOutput = 0;
  let totalRequests = 0;
  let totalCusto = 0;

  for (const bucket of buckets) {
    const dia = new Date(bucket.start_time * 1000).toISOString().split("T")[0];

    for (const r of bucket.results) {
      const input = r.input_tokens ?? 0;
      const output = r.output_tokens ?? 0;
      const requests = r.num_model_requests ?? 0;
      const modelos = r.model_ids ?? ["gpt-4o-mini"];
      const modeloPrincipal = modelos[0] ?? "gpt-4o-mini";
      const custo = calcularCusto(modeloPrincipal, input, output);

      if (!porDia[dia]) porDia[dia] = { input: 0, output: 0, requests: 0, custo: 0 };
      porDia[dia].input += input;
      porDia[dia].output += output;
      porDia[dia].requests += requests;
      porDia[dia].custo += custo;

      const modeloBase = Object.keys(PRECOS).find((k) => modeloPrincipal.toLowerCase().includes(k)) ?? modeloPrincipal;
      if (!porModelo[modeloBase]) porModelo[modeloBase] = { input: 0, output: 0, requests: 0, custo: 0 };
      porModelo[modeloBase].input += input;
      porModelo[modeloBase].output += output;
      porModelo[modeloBase].requests += requests;
      porModelo[modeloBase].custo += custo;

      totalInput += input;
      totalOutput += output;
      totalRequests += requests;
      totalCusto += custo;
    }
  }

  const diasOrdenados = Object.entries(porDia)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dia, v]) => ({ dia, ...v }));

  return NextResponse.json({
    period,
    start,
    end,
    total_tokens: totalInput + totalOutput,
    total_input_tokens: totalInput,
    total_output_tokens: totalOutput,
    total_requests: totalRequests,
    total_custo_usd: totalCusto,
    por_dia: diasOrdenados,
    por_modelo: porModelo,
  });
}
