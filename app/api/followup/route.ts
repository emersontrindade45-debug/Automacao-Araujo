import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispararWebhookN8n } from "@/lib/n8n/client";
import { buildFollowUpPayload } from "@/lib/n8n/payloads";
import type { Cliente } from "@/lib/types";

// Configurações padrão (substituídas pelas configurações do admin se disponíveis)
const DEFAULT_DIAS_INATIVIDADE = 3;
const DEFAULT_MAX_TENTATIVAS = 3;
const DEFAULT_MENSAGEM = "Olá! Vimos que você ainda não finalizou seu pedido. Podemos ajudar?";

export async function POST(request: NextRequest) {
  // Validar secret de cron
  const cronSecret = request.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Carregar configurações do admin
  const { data: config } = await supabase
    .from("configuracoes")
    .select("*")
    .eq("chave", "followup")
    .single();

  const cfg = (config?.valor as {
    dias_inatividade?: number;
    max_tentativas?: number;
    mensagem?: string;
  } | null) ?? {};

  const diasInatividade = cfg.dias_inatividade ?? DEFAULT_DIAS_INATIVIDADE;
  const maxTentativas = cfg.max_tentativas ?? DEFAULT_MAX_TENTATIVAS;
  const mensagem = cfg.mensagem ?? DEFAULT_MENSAGEM;

  const limiteData = new Date();
  limiteData.setDate(limiteData.getDate() - diasInatividade);

  // Buscar clientes em follow_up com mais de X dias sem atualização
  const { data: clientes, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("etapa_atual", "follow_up")
    .lt("atualizado_em", limiteData.toISOString());

  if (error) {
    console.error("[followup] erro ao buscar clientes:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const resultados: { id: string; acao: string }[] = [];

  for (const cliente of (clientes ?? []) as Cliente[]) {
    // Contar tentativas anteriores de follow-up
    const { count } = await supabase
      .from("logs")
      .select("*", { count: "exact", head: true })
      .eq("tipo", "followup_disparado")
      .eq("payload->>cliente_id", cliente.id);

    const tentativas = count ?? 0;

    if (tentativas >= maxTentativas) {
      // Mover para marketing após N tentativas sem resposta
      await supabase
        .from("clientes")
        .update({ etapa_atual: "marketing" })
        .eq("id", cliente.id);

      await supabase.from("logs").insert({
        tipo: "followup_movido_marketing",
        payload: { cliente_id: cliente.id, tentativas },
      });

      resultados.push({ id: cliente.id, acao: "movido_para_marketing" });
      continue;
    }

    // Disparar mensagem via N8n
    const payload = buildFollowUpPayload({
      cliente_id: cliente.id,
      nome: cliente.nome,
      telefone: cliente.telefone,
      canal_origem: cliente.canal_origem,
      dias_sem_resposta: diasInatividade,
      mensagem,
    });

    await dispararWebhookN8n("follow-up", payload);

    // Registrar tentativa
    await supabase.from("logs").insert({
      tipo: "followup_disparado",
      payload: {
        cliente_id: cliente.id,
        nome: cliente.nome,
        canal_origem: cliente.canal_origem,
        tentativa: tentativas + 1,
      },
    });

    resultados.push({ id: cliente.id, acao: "followup_disparado" });
  }

  return NextResponse.json({
    ok: true,
    processados: resultados.length,
    detalhes: resultados,
  });
}

// GET para facilitar testes manuais (sem body)
export async function GET(request: NextRequest) {
  return POST(request);
}
