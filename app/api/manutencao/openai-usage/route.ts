import { NextRequest, NextResponse } from "next/server";

const PRECOS: Record<string, { input: number; output: number }> = {
  "gpt-4o":              { input: 0.000005,   output: 0.000015 },
  "gpt-4o-mini":         { input: 0.00000015, output: 0.0000006 },
  "gpt-4-turbo":         { input: 0.00001,    output: 0.00003 },
  "gpt-3.5-turbo":       { input: 0.0000005,  output: 0.0000015 },
  "text-embedding-ada-002": { input: 0.0000001, output: 0 },
  "text-embedding-3-small": { input: 0.00000002, output: 0 },
  "text-embedding-3-large": { input: 0.00000013, output: 0 },
};

function calcularCusto(model: string, input: number, output: number): number {
  const key = Object.keys(PRECOS).find((k) => model.startsWith(k)) ?? "gpt-4o-mini";
  const p = PRECOS[key];
  return input * p.input + output * p.output;
}

function periodoParaDatas(period: string): { start: string; end: string } {
  const agora = new Date();
  const fim = agora.toISOString().split("T")[0];
  const inicio = new Date(agora);

  switch (period) {
    case "1d":  inicio.setDate(inicio.getDate() - 1); break;
    case "3d":  inicio.setDate(inicio.getDate() - 3); break;
    case "7d":  inicio.setDate(inicio.getDate() - 7); break;
    case "15d": inicio.setDate(inicio.getDate() - 15); break;
    case "30d": inicio.setDate(inicio.getDate() - 30); break;
    default:    inicio.setDate(inicio.getDate() - 7);
  }

  return { start: inicio.toISOString().split("T")[0], end: fim };
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY não configurada" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "7d";
  const { start, end } = periodoParaDatas(period);

  // Busca uso diário da API da OpenAI
  const url = `https://api.openai.com/v1/usage?date=${start}&end_date=${end}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const erro = await res.text();
    console.error("[openai-usage] erro:", erro);
    return NextResponse.json({ error: "Erro ao consultar OpenAI", detail: erro }, { status: 502 });
  }

  const data = await res.json() as {
    data?: {
      aggregation_timestamp: number;
      n_requests: number;
      operation: string;
      snapshot_id: string;
      n_context_tokens_total: number;
      n_generated_tokens_total: number;
    }[];
    ft_data?: unknown[];
    dalle_api_data?: unknown[];
    whisper_api_data?: unknown[];
    current_usage_usd?: number;
  };

  const registros = data.data ?? [];

  // Agrega por dia
  const porDia: Record<string, { input: number; output: number; requests: number; custo: number }> = {};
  // Agrega por modelo
  const porModelo: Record<string, { input: number; output: number; requests: number; custo: number }> = {};

  let totalInput = 0;
  let totalOutput = 0;
  let totalRequests = 0;
  let totalCusto = 0;

  for (const r of registros) {
    const dia = new Date(r.aggregation_timestamp * 1000).toISOString().split("T")[0];
    const modelo = r.snapshot_id ?? "desconhecido";
    const input = r.n_context_tokens_total ?? 0;
    const output = r.n_generated_tokens_total ?? 0;
    const requests = r.n_requests ?? 0;
    const custo = calcularCusto(modelo, input, output);

    // Por dia
    if (!porDia[dia]) porDia[dia] = { input: 0, output: 0, requests: 0, custo: 0 };
    porDia[dia].input += input;
    porDia[dia].output += output;
    porDia[dia].requests += requests;
    porDia[dia].custo += custo;

    // Por modelo
    const modeloBase = Object.keys(PRECOS).find((k) => modelo.startsWith(k)) ?? modelo;
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

  // Ordena dias cronologicamente
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
