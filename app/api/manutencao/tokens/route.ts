import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Custo por token em USD (valores atuais)
const PRECOS: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 0.000005, output: 0.000015 },
  "gpt-4o-mini": { input: 0.00000015, output: 0.0000006 },
  "gpt-4-turbo": { input: 0.00001, output: 0.00003 },
  "gpt-3.5-turbo": { input: 0.0000005, output: 0.0000015 },
};

function calcularCusto(model: string, promptTokens: number, completionTokens: number): number {
  const preco = PRECOS[model] ?? PRECOS["gpt-4o-mini"];
  return promptTokens * preco.input + completionTokens * preco.output;
}

export async function POST(request: NextRequest) {
  let body: {
    source?: string;
    model?: string;
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.source || !body.model) {
    return NextResponse.json({ error: "source e model são obrigatórios" }, { status: 400 });
  }

  const promptTokens = body.prompt_tokens ?? 0;
  const completionTokens = body.completion_tokens ?? 0;
  const totalTokens = body.total_tokens ?? promptTokens + completionTokens;
  const custoUsd = calcularCusto(body.model, promptTokens, completionTokens);

  const sb = createAdminClient();
  const { error } = await sb.from("manutencao_tokens").insert({
    source: body.source,
    model: body.model,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
    custo_usd: custoUsd,
  });

  if (error) {
    console.error("[manutencao/tokens] erro ao inserir:", error);
    return NextResponse.json({ error: "Erro ao salvar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, custo_usd: custoUsd }, { status: 201 });
}
