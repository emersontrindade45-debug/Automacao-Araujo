import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { transcreverAudio } from "@/lib/openai/whisper";
import { detectarAtualizacaoPreco } from "@/lib/precos/detectar";
import { notificarPrecoParaAprovacao } from "@/lib/resend/notificacoes";
import type { WhatsAppPayload, WhatsAppTextMessage, WhatsAppAudioMessage } from "@/lib/types/webhooks";

// GET — desafio de verificação (reutiliza o mesmo token do webhook principal)
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// POST — receber mensagens de atualização de preço
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!verificarAssinatura(request, rawBody)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: WhatsAppPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.object !== "whatsapp_business_account") {
    return NextResponse.json({ ok: true });
  }

  const supabase = createAdminClient();
  const adminEmail = process.env.ADMIN_EMAIL;

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      const value = change.value;
      if (!value.messages?.length) continue;

      for (const message of value.messages) {
        const solicitadoPor =
          value.contacts?.find((c) => c.wa_id === message.from)?.profile.name ??
          message.from;

        let textoParaAnalise: string | null = null;

        if (message.type === "text") {
          textoParaAnalise = (message as WhatsAppTextMessage).text.body;
        } else if (message.type === "audio") {
          const audio = message as WhatsAppAudioMessage;
          textoParaAnalise = await transcreverAudio(audio.audio.id, audio.audio.mime_type);
        }

        if (!textoParaAnalise) continue;

        const detectado = detectarAtualizacaoPreco(textoParaAnalise);
        if (!detectado) continue;

        // Buscar produto pelo nome (correspondência parcial, case-insensitive)
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
            payload: { texto: textoParaAnalise, texto_produto: detectado.texto_produto, de: message.from },
          });
          continue;
        }

        // Criar registro em precos com status pendente
        const { data: novoPreco, error: precoError } = await supabase
          .from("precos")
          .insert({
            produto_id: produto.id,
            preco_novo: detectado.valor,
            status: "pendente",
            solicitado_por: solicitadoPor,
          })
          .select()
          .single();

        if (precoError) {
          console.error("[price-update] erro ao criar registro de preço:", precoError);
          continue;
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
            de: message.from,
          },
        });

        // Enviar notificação ao admin se email configurado
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
      }
    }
  }

  return NextResponse.json({ ok: true });
}

function verificarAssinatura(request: NextRequest, body: string): boolean {
  const signature = request.headers.get("x-hub-signature-256");
  if (!signature) return false;

  const token = process.env.WHATSAPP_TOKEN;
  if (!token) return false;

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", token).update(body).digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
