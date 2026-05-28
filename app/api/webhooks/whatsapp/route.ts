import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispararWebhookN8n } from "@/lib/n8n/client";
import {
  type EvolutionWebhookPayload,
  evolutionGetTelefone,
  evolutionGetTexto,
  evolutionIsGrupo,
} from "@/lib/types/webhooks";

// POST — receber eventos do Evolution API
export async function POST(request: NextRequest) {
  // Validar secret opcional (configure WHATSAPP_VERIFY_TOKEN no Evolution como apikey)
  const apikey = request.headers.get("apikey");
  if (process.env.WHATSAPP_VERIFY_TOKEN && apikey !== process.env.WHATSAPP_VERIFY_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: EvolutionWebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Processar apenas mensagens recebidas (não enviadas pelo bot)
  if (payload.event !== "messages.upsert") {
    return NextResponse.json({ ok: true });
  }

  const { data } = payload;

  // Ignorar mensagens enviadas pelo próprio número e mensagens de grupo
  if (data.key.fromMe || evolutionIsGrupo(data)) {
    return NextResponse.json({ ok: true });
  }

  const telefone = evolutionGetTelefone(data);
  const nome = data.pushName ?? telefone;
  const texto = evolutionGetTexto(data);

  const supabase = createAdminClient();

  // Verificar se cliente já existe e qual era sua etapa anterior
  const ETAPAS_RETORNANTE = ["entregue", "cancelado"] as const;
  const { data: clienteExistente } = await supabase
    .from("clientes")
    .select("etapa_atual")
    .eq("telefone", telefone)
    .single();

  const etapaAnterior = clienteExistente?.etapa_atual ?? null;
  const isRetornante = ETAPAS_RETORNANTE.includes(etapaAnterior as typeof ETAPAS_RETORNANTE[number]);

  // Upsert cliente — preserva etapa se for retornante, senão move para atendimento
  const { data: cliente, error: upsertError } = await supabase
    .from("clientes")
    .upsert(
      {
        nome,
        telefone,
        canal_origem: "whatsapp",
        etapa_atual: isRetornante ? etapaAnterior! : "atendimento",
      },
      { onConflict: "telefone", ignoreDuplicates: false }
    )
    .select()
    .single();

  if (upsertError) {
    console.error("[webhook/whatsapp] upsert cliente:", upsertError);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  // Registrar log
  await supabase.from("logs").insert({
    tipo: "whatsapp_mensagem",
    payload: {
      cliente_id: cliente.id,
      message_id: data.key.id,
      from: telefone,
      type: data.messageType,
      texto,
      timestamp: data.messageTimestamp,
      instance: payload.instance,
    },
  });

  // Disparar evento ao N8n para processamento com IA
  await dispararWebhookN8n("atendimento", {
    tipo: "mensagem_recebida",
    cliente_id: cliente.id,
    nome,
    telefone,
    canal_origem: "whatsapp",
    texto,
    message_type: data.messageType,
    instance: payload.instance,
    message_id: data.key.id,
    timestamp: data.messageTimestamp,
    is_retornante: isRetornante,
    etapa_anterior: isRetornante ? etapaAnterior : null,
  });

  return NextResponse.json({ ok: true });
}
