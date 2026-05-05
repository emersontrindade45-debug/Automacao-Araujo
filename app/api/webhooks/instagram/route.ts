import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InstagramPayload } from "@/lib/types/webhooks";

// GET — desafio de verificação do Meta
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.INSTAGRAM_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// POST — receber mensagens do Instagram
export async function POST(request: NextRequest) {
  let payload: InstagramPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.object !== "instagram") {
    return NextResponse.json({ ok: true });
  }

  const supabase = createAdminClient();

  for (const entry of payload.entry) {
    for (const messaging of entry.messaging) {
      if (!messaging.message) continue;

      const senderId = messaging.sender.id;

      const { data: cliente, error: upsertError } = await supabase
        .from("clientes")
        .upsert(
          {
            nome: senderId,
            telefone: senderId,
            canal_origem: "instagram",
            etapa_atual: "atendimento",
          },
          { onConflict: "telefone", ignoreDuplicates: false }
        )
        .select()
        .single();

      if (upsertError) {
        console.error("[webhook/instagram] upsert cliente:", upsertError);
        continue;
      }

      await supabase.from("logs").insert({
        tipo: "instagram_mensagem",
        payload: {
          cliente_id: cliente.id,
          sender_id: senderId,
          message_id: messaging.message.mid,
          timestamp: messaging.timestamp,
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
