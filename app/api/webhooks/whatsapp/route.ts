import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WhatsAppPayload } from "@/lib/types/webhooks";

// GET — desafio de verificação do Meta
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

// POST — receber mensagens do WhatsApp
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

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      const value = change.value;
      if (!value.messages?.length) continue;

      for (const message of value.messages) {
        const nome =
          value.contacts?.find((c) => c.wa_id === message.from)?.profile.name ??
          message.from;

        // Upsert cliente — mantém etapa se já existir, senão inicia como "atendimento"
        const { data: cliente, error: upsertError } = await supabase
          .from("clientes")
          .upsert(
            {
              nome,
              telefone: message.from,
              canal_origem: "whatsapp",
              etapa_atual: "atendimento",
            },
            { onConflict: "telefone", ignoreDuplicates: false }
          )
          .select()
          .single();

        if (upsertError) {
          console.error("[webhook/whatsapp] upsert cliente:", upsertError);
          continue;
        }

        // Registrar log
        await supabase.from("logs").insert({
          tipo: "whatsapp_mensagem",
          payload: {
            cliente_id: cliente.id,
            message_id: message.id,
            from: message.from,
            type: message.type,
            timestamp: message.timestamp,
          },
        });
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

  const expected = "sha256=" + crypto
    .createHmac("sha256", token)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
