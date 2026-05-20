import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { transcreverAudio } from "@/lib/openai/whisper";
import { detectarAtualizacaoPreco } from "@/lib/precos/detectar";
import { notificarPrecoParaAprovacao } from "@/lib/resend/notificacoes";
import {
  type EvolutionWebhookPayload,
  evolutionGetTelefone,
  evolutionGetTexto,
  evolutionIsAudio,
  evolutionIsGrupo,
} from "@/lib/types/webhooks";

// POST — receber mensagens de atualização de preço via Evolution API
export async function POST(request: NextRequest) {
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

  if (payload.event !== "messages.upsert") {
    return NextResponse.json({ ok: true });
  }

  const { data } = payload;

  if (data.key.fromMe || evolutionIsGrupo(data)) {
    return NextResponse.json({ ok: true });
  }

  const telefone = evolutionGetTelefone(data);
  const solicitadoPor = data.pushName ?? telefone;

  const supabase = createAdminClient();
  const telefoneNumerico = telefone.replace(/\D/g, "");
  const { data: autorizado } = await supabase
    .from("funcionarios_autorizados")
    .select("id")
    .eq("telefone", telefoneNumerico)
    .eq("ativo", true)
    .maybeSingle();

  if (!autorizado) {
    return NextResponse.json({ ok: true });
  }

  let textoParaAnalise: string | null = null;

  if (evolutionIsAudio(data)) {
    const audioData = data.message.audioMessage;
    // Evolution envia áudio como base64 ou URL — tenta base64 primeiro
    if (audioData?.base64) {
      textoParaAnalise = await transcreverAudio(audioData.base64, audioData.mimetype ?? "audio/ogg");
    } else if (audioData?.url) {
      textoParaAnalise = await transcreverAudio(audioData.url, audioData.mimetype ?? "audio/ogg");
    }
  } else {
    textoParaAnalise = evolutionGetTexto(data);
  }

  if (!textoParaAnalise) {
    return NextResponse.json({ ok: true });
  }

  const detectado = detectarAtualizacaoPreco(textoParaAnalise);
  if (!detectado) {
    return NextResponse.json({ ok: true });
  }

  const adminEmail = process.env.ADMIN_EMAIL;

  const { data: produtos } = await supabase
    .from("produtos")
    .select("id, nome, preco_atual")
    .ilike("nome", `%${detectado.texto_produto}%`)
    .limit(1);

  const produto = produtos?.[0];

  if (!produto) {
    console.warn(`[price-update] produto não encontrado: "${detectado.texto_produto}"`);
    await supabase.from("logs").insert({
      tipo: "price_update_produto_nao_encontrado",
      payload: { texto: textoParaAnalise, texto_produto: detectado.texto_produto, de: telefone },
    });
    return NextResponse.json({ ok: true });
  }

  const { data: novoPreco, error: precoError } = await supabase
    .from("precos")
    .insert({
      produto_id: produto.id,
      preco_novo: detectado.valor,
      status: "pendente",
      solicitado_por: solicitadoPor,
      telefone,
    })
    .select()
    .single();

  if (precoError) {
    console.error("[price-update] erro ao criar registro de preço:", precoError);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  await supabase.from("logs").insert({
    tipo: "price_update_solicitado",
    payload: {
      preco_id: novoPreco.id,
      produto_id: produto.id,
      produto_nome: produto.nome,
      preco_atual: produto.preco_atual,
      preco_novo: detectado.valor,
      solicitado_por: solicitadoPor,
      de: telefone,
      instance: payload.instance,
    },
  });

  if (adminEmail) {
    await notificarPrecoParaAprovacao({
      produtoNome: produto.nome,
      precoNovo: detectado.valor,
      precoAtual: produto.preco_atual,
      solicitadoPor,
      precoId: novoPreco.id,
      adminEmail,
    });
  }

  return NextResponse.json({ ok: true });
}
