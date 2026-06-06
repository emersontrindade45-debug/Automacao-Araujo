"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function resolverErroAction(id: string) {
  const sb = createAdminClient();
  await sb
    .from("manutencao_erros")
    .update({ status: "resolvido_dev", resolved_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/crm/manutencao");
}

export type ErroManutencao = {
  id: string;
  created_at: string;
  source: string;
  workflow_name: string | null;
  node_name: string | null;
  route: string | null;
  error_message: string;
  error_stack: string | null;
  context: unknown;
  status: string;
  diagnostico_ia: string | null;
  tentativas_ia: unknown[];
  resolved_at: string | null;
};

export type ResumoTokens = {
  periodo: string;
  total_tokens: number;
  total_custo_usd: number;
  total_chamadas: number;
  por_source: Record<string, { tokens: number; custo: number; chamadas: number }>;
  por_model: Record<string, { tokens: number; custo: number; chamadas: number }>;
};

export async function getErros(status?: string): Promise<ErroManutencao[]> {
  const sb = createAdminClient();
  let query = sb
    .from("manutencao_erros")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status && status !== "todos") {
    query = query.eq("status", status);
  }

  const { data } = await query;
  return (data ?? []) as ErroManutencao[];
}

export async function getResumoTokens(period: string): Promise<ResumoTokens> {
  const PERIODOS_VALIDOS = ["1h", "24h", "7d", "10d", "15d", "30d"];
  const periodoSafe = PERIODOS_VALIDOS.includes(period) ? period : "24h";

  const sb = createAdminClient();
  const agora = new Date();

  const mapa: Record<string, () => Date> = {
    "1h":  () => { const d = new Date(agora); d.setHours(d.getHours() - 1); return d; },
    "24h": () => { const d = new Date(agora); d.setDate(d.getDate() - 1); return d; },
    "7d":  () => { const d = new Date(agora); d.setDate(d.getDate() - 7); return d; },
    "10d": () => { const d = new Date(agora); d.setDate(d.getDate() - 10); return d; },
    "15d": () => { const d = new Date(agora); d.setDate(d.getDate() - 15); return d; },
    "30d": () => { const d = new Date(agora); d.setDate(d.getDate() - 30); return d; },
  };

  const desde = mapa[periodoSafe]();

  const { data } = await sb
    .from("manutencao_tokens")
    .select("source, model, prompt_tokens, completion_tokens, total_tokens, custo_usd")
    .gte("created_at", desde.toISOString());

  const registros = data ?? [];
  const totalTokens = registros.reduce((s, r) => s + r.total_tokens, 0);
  const totalCusto = registros.reduce((s, r) => s + Number(r.custo_usd), 0);

  const porSource: Record<string, { tokens: number; custo: number; chamadas: number }> = {};
  const porModel: Record<string, { tokens: number; custo: number; chamadas: number }> = {};

  for (const r of registros) {
    if (!porSource[r.source]) porSource[r.source] = { tokens: 0, custo: 0, chamadas: 0 };
    porSource[r.source].tokens += r.total_tokens;
    porSource[r.source].custo += Number(r.custo_usd);
    porSource[r.source].chamadas += 1;

    if (!porModel[r.model]) porModel[r.model] = { tokens: 0, custo: 0, chamadas: 0 };
    porModel[r.model].tokens += r.total_tokens;
    porModel[r.model].custo += Number(r.custo_usd);
    porModel[r.model].chamadas += 1;
  }

  return {
    periodo: periodoSafe,
    total_tokens: totalTokens,
    total_custo_usd: totalCusto,
    total_chamadas: registros.length,
    por_source: porSource,
    por_model: porModel,
  };
}
