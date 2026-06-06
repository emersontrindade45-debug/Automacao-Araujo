import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { executarAgenteManutencao, type ErroPayload } from "@/lib/manutencao/agente";

export async function POST(request: NextRequest) {
  let body: Partial<ErroPayload>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.source || !body.error_message) {
    return NextResponse.json({ error: "source e error_message são obrigatórios" }, { status: 400 });
  }

  const sb = createAdminClient();

  const { data, error } = await sb
    .from("manutencao_erros")
    .insert({
      source: body.source,
      workflow_name: body.workflow_name ?? null,
      node_name: body.node_name ?? null,
      route: body.route ?? null,
      error_message: body.error_message,
      error_stack: body.error_stack ?? null,
      context: body.context ?? null,
      status: "pendente",
    })
    .select()
    .single();

  if (error || !data) {
    console.error("[manutencao/erros] erro ao inserir:", error);
    return NextResponse.json({ error: "Erro ao salvar" }, { status: 500 });
  }

  // Aciona o agente em background — não bloqueia a resposta
  const erroPayload: ErroPayload = {
    id: data.id,
    source: data.source,
    workflow_name: data.workflow_name,
    node_name: data.node_name,
    route: data.route,
    error_message: data.error_message,
    error_stack: data.error_stack,
    context: data.context,
  };

  // Fire-and-forget: agente roda async sem segurar o response
  executarAgenteManutencao(erroPayload).catch((err) => {
    console.error("[manutencao/erros] agente falhou:", err);
  });

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
