import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PERIODOS_VALIDOS = ["1h", "24h", "7d", "10d", "15d", "30d"] as const;
type Periodo = (typeof PERIODOS_VALIDOS)[number];

function periodoParaData(periodo: Periodo): Date {
  const agora = new Date();
  switch (periodo) {
    case "1h":  agora.setHours(agora.getHours() - 1); break;
    case "24h": agora.setDate(agora.getDate() - 1); break;
    case "7d":  agora.setDate(agora.getDate() - 7); break;
    case "10d": agora.setDate(agora.getDate() - 10); break;
    case "15d": agora.setDate(agora.getDate() - 15); break;
    case "30d": agora.setDate(agora.getDate() - 30); break;
  }
  return agora;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const periodoRaw = searchParams.get("period") ?? "24h";
  const periodo = PERIODOS_VALIDOS.includes(periodoRaw as Periodo)
    ? (periodoRaw as Periodo)
    : "24h";

  const desde = periodoParaData(periodo);
  const sb = createAdminClient();

  const { data, error } = await sb
    .from("manutencao_tokens")
    .select("source, model, prompt_tokens, completion_tokens, total_tokens, custo_usd")
    .gte("created_at", desde.toISOString());

  if (error) {
    return NextResponse.json({ error: "Erro ao buscar tokens" }, { status: 500 });
  }

  const registros = data ?? [];

  // Totais gerais
  const totalTokens = registros.reduce((s, r) => s + r.total_tokens, 0);
  const totalCusto = registros.reduce((s, r) => s + Number(r.custo_usd), 0);
  const totalChamadas = registros.length;

  // Breakdown por source
  const porSource: Record<string, { tokens: number; custo: number; chamadas: number }> = {};
  for (const r of registros) {
    if (!porSource[r.source]) porSource[r.source] = { tokens: 0, custo: 0, chamadas: 0 };
    porSource[r.source].tokens += r.total_tokens;
    porSource[r.source].custo += Number(r.custo_usd);
    porSource[r.source].chamadas += 1;
  }

  // Breakdown por model
  const porModel: Record<string, { tokens: number; custo: number; chamadas: number }> = {};
  for (const r of registros) {
    if (!porModel[r.model]) porModel[r.model] = { tokens: 0, custo: 0, chamadas: 0 };
    porModel[r.model].tokens += r.total_tokens;
    porModel[r.model].custo += Number(r.custo_usd);
    porModel[r.model].chamadas += 1;
  }

  return NextResponse.json({
    periodo,
    desde: desde.toISOString(),
    total_tokens: totalTokens,
    total_custo_usd: totalCusto,
    total_chamadas: totalChamadas,
    por_source: porSource,
    por_model: porModel,
  });
}
