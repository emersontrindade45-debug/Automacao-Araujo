import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { HandoffPayload } from "@/lib/types";

type HandoffTipo =
  | "ambiguo"
  | "pedido_confirmado"
  | "separacao_completa"
  | "sem_resposta";

interface N8nHandoffBody {
  tipo: HandoffTipo;
  handoff: HandoffPayload & {
    endereco_entrega?: string;
    forma_pagamento?: string;
  };
  atendente_email?: string;
}

const HANDOFFS_CRITICOS: HandoffTipo[] = ["pedido_confirmado", "sem_resposta"];

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-n8n-secret");
  if (secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: N8nHandoffBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { tipo, handoff, atendente_email } = body;
  const supabase = createAdminClient();
  let pedidoCriado: { id: string; numero_pedido: number } | null = null;

  // Upsert cliente
  const { data: cliente, error: upsertError } = await supabase
    .from("clientes")
    .upsert(
      {
        nome: handoff.nome,
        telefone: handoff.telefone,
        canal_origem: handoff.canal_origem,
        etapa_atual: resolverEtapa(tipo),
      },
      { onConflict: "telefone", ignoreDuplicates: false }
    )
    .select()
    .single();

  if (upsertError) {
    console.error("[webhook/n8n] upsert cliente:", upsertError);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  // Criar pedido quando confirmado
  if (tipo === "pedido_confirmado" && handoff.itens_pedido.length > 0) {
    const total = handoff.itens_pedido.reduce(
      (acc, item) => acc + item.preco_unitario * item.quantidade,
      0
    );

    const { data: pedido, error: pedidoError } = await supabase
      .from("pedidos")
      .insert({
        cliente_id: cliente.id,
        itens: handoff.itens_pedido,
        status: "pedido_gerado",
        endereco_entrega: handoff.endereco_entrega ?? "",
        forma_pagamento: handoff.forma_pagamento ?? "",
        total,
      })
      .select("id, numero_pedido")
      .single();

    if (pedidoError) {
      console.error("[webhook/n8n] criar pedido:", pedidoError);
    } else {
      pedidoCriado = pedido;
    }
  }

  // Registrar log
  await supabase.from("logs").insert({
    tipo: `handoff_${tipo}`,
    payload: {
      cliente_id: cliente.id,
      handoff,
      proxima_acao: handoff.proxima_acao,
    },
  });

  // Notificação por e-mail para handoffs críticos
  if (HANDOFFS_CRITICOS.includes(tipo) && atendente_email) {
    await enviarNotificacao({ tipo, handoff, atendente_email });
  }

  return NextResponse.json({
    ok: true,
    cliente_id: cliente.id,
    pedido_id: pedidoCriado?.id ?? null,
    numero_pedido: pedidoCriado?.numero_pedido ?? null,
  });
}

function resolverEtapa(tipo: HandoffTipo) {
  switch (tipo) {
    case "ambiguo":
      return "atendimento";
    case "pedido_confirmado":
      return "pedido_gerado";
    case "separacao_completa":
      return "em_rota";
    case "sem_resposta":
      return "follow_up";
  }
}

async function enviarNotificacao({
  tipo,
  handoff,
  atendente_email,
}: {
  tipo: HandoffTipo;
  handoff: HandoffPayload;
  atendente_email: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const assuntos: Record<HandoffTipo, string> = {
    pedido_confirmado: `Novo pedido confirmado — ${handoff.nome}`,
    sem_resposta: `Cliente sem resposta — ${handoff.nome}`,
    ambiguo: `Atendimento necessário — ${handoff.nome}`,
    separacao_completa: `Separação completa — ${handoff.nome}`,
  };

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Araujo Hub <noreply@araujohub.com.br>",
      to: [atendente_email],
      subject: assuntos[tipo],
      html: `
        <h2>${assuntos[tipo]}</h2>
        <p><strong>Cliente:</strong> ${handoff.nome}</p>
        <p><strong>Telefone:</strong> ${handoff.telefone}</p>
        <p><strong>Canal:</strong> ${handoff.canal_origem}</p>
        <p><strong>Próxima ação:</strong> ${handoff.proxima_acao}</p>
        ${
          handoff.ultimas_mensagens.length > 0
            ? `<p><strong>Últimas mensagens:</strong></p><ul>${handoff.ultimas_mensagens
                .map((m) => `<li>${m}</li>`)
                .join("")}</ul>`
            : ""
        }
      `,
    }),
  });
}
