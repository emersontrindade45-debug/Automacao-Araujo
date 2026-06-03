import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispararWebhookN8n } from "@/lib/n8n/client";
import { buildFollowUpPayload } from "@/lib/n8n/payloads";
import type { Cliente } from "@/lib/types";

const DEFAULT_DIAS_INATIVIDADE = 1;
const DEFAULT_MAX_TENTATIVAS = 3;
const DEFAULT_MENSAGENS = [
  "Olá, {nome}! Passou por aqui mas não finalizou. Posso te ajudar com alguma coisa?",
  "{nome}, ainda estamos aqui! Temos ótimas opções hoje. Posso te mostrar nossas ofertas?",
  "{nome}, última chance de aproveitar nossas ofertas desta semana. Posso ajudar?",
];
const DEFAULT_INTERVALOS_DIAS = [1, 2, 3];

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: config } = await supabase
    .from("configuracoes")
    .select("*")
    .eq("chave", "followup")
    .single();

  const cfg = (config?.valor as {
    dias_inatividade?: number;
    max_tentativas?: number;
    mensagens?: string[];
    intervalos_dias?: number[];
  } | null) ?? {};

  const diasInatividade = cfg.dias_inatividade ?? DEFAULT_DIAS_INATIVIDADE;
  const maxTentativas = cfg.max_tentativas ?? DEFAULT_MAX_TENTATIVAS;
  const mensagens = cfg.mensagens ?? DEFAULT_MENSAGENS;
  const intervalosDias = cfg.intervalos_dias ?? DEFAULT_INTERVALOS_DIAS;

  const limiteData = new Date();
  limiteData.setDate(limiteData.getDate() - diasInatividade);

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
    const { count } = await supabase
      .from("logs")
      .select("*", { count: "exact", head: true })
      .eq("tipo", "followup_disparado")
      .eq("payload->>cliente_id", cliente.id);

    const tentativas = count ?? 0;

    if (tentativas >= maxTentativas) {
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

    // Verificar se já passou o intervalo correto desde a última tentativa
    const intervaloDias = intervalosDias[tentativas] ?? intervalosDias[intervalosDias.length - 1];
    const { data: ultimoLog } = await supabase
      .from("logs")
      .select("criado_em")
      .eq("tipo", "followup_disparado")
      .eq("payload->>cliente_id", cliente.id)
      .order("criado_em", { ascending: false })
      .limit(1)
      .single();

    if (ultimoLog) {
      const diasDesdeUltimo = (Date.now() - new Date(ultimoLog.criado_em).getTime()) / (1000 * 60 * 60 * 24);
      if (diasDesdeUltimo < intervaloDias) {
        resultados.push({ id: cliente.id, acao: "aguardando_intervalo" });
        continue;
      }
    }

    // Selecionar mensagem da tentativa atual e substituir {nome}
    const mensagemTemplate = mensagens[tentativas] ?? mensagens[mensagens.length - 1];
    const mensagem = mensagemTemplate.replace(/\{nome\}/g, cliente.nome || "");

    const payload = buildFollowUpPayload({
      cliente_id: cliente.id,
      nome: cliente.nome,
      telefone: cliente.telefone,
      canal_origem: cliente.canal_origem,
      dias_sem_resposta: diasInatividade,
      mensagem,
    });

    await dispararWebhookN8n("follow-up", payload);

    await supabase.from("logs").insert({
      tipo: "followup_disparado",
      payload: {
        cliente_id: cliente.id,
        nome: cliente.nome,
        canal_origem: cliente.canal_origem,
        tentativa: tentativas + 1,
        mensagem,
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

export async function GET(request: NextRequest) {
  return POST(request);
}
