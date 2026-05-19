import { createAdminClient } from "@/lib/supabase/admin";
import type { Etapa, ItemPedido } from "@/lib/types";

const EVOLUTION_URL =
  process.env.EVOLUTION_API_URL ?? "https://evo.evoapi.shop";
const EVOLUTION_KEY =
  process.env.EVOLUTION_API_KEY ?? "221ad739-d54f-4024-b870-d40055904167";
const EVOLUTION_INSTANCE =
  process.env.EVOLUTION_INSTANCE ?? "Araujo";
const GRUPO_JID =
  process.env.WHATSAPP_GROUP_NOTIF_JID ?? "120363407417286654@g.us";

async function enviarWhatsApp(numero: string, texto: string): Promise<void> {
  if (!EVOLUTION_KEY) {
    console.warn("[whatsapp] EVOLUTION_API_KEY não configurada — notificação ignorada");
    return;
  }

  const url = `${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: EVOLUTION_KEY,
    },
    body: JSON.stringify({ number: numero, text: texto }),
  });

  if (!res.ok) {
    console.error(`[whatsapp] Falha ao enviar para ${numero}: ${res.status}`);
  }
}

function formatarNumeroPedido(n: number) {
  return `#${String(n).padStart(6, "0")}`;
}

function formatarItens(itens: ItemPedido[]): string {
  return itens.map((i) => `${i.quantidade}× ${i.nome}`).join(", ");
}

// ─── Notificação por clienteId (usado pelo Kanban) ─────────────────────────

export async function notificarEtapaCliente(
  clienteId: string,
  etapa: Etapa
): Promise<void> {
  if (etapa !== "separacao" && etapa !== "em_rota") return;

  try {
    const supabase = createAdminClient();

    const { data: cliente } = await supabase
      .from("clientes")
      .select("nome, telefone")
      .eq("id", clienteId)
      .single();

    if (!cliente) return;

    const { data: pedido } = await supabase
      .from("pedidos")
      .select("numero_pedido, itens, endereco_entrega")
      .eq("cliente_id", clienteId)
      .order("criado_em", { ascending: false })
      .limit(1)
      .single();

    await _enviarNotificacoes(
      cliente.nome,
      cliente.telefone,
      pedido?.numero_pedido ?? null,
      pedido?.itens ?? [],
      pedido?.endereco_entrega ?? "",
      etapa
    );
  } catch (err) {
    console.error("[whatsapp] notificarEtapaCliente:", err);
  }
}

// ─── Notificação por pedidoId (usado pela página de Pedidos) ───────────────

export async function notificarEtapaPedido(
  pedidoId: string,
  etapa: Etapa
): Promise<void> {
  if (etapa !== "separacao" && etapa !== "em_rota") return;

  try {
    const supabase = createAdminClient();

    const { data: pedido } = await supabase
      .from("pedidos")
      .select("numero_pedido, itens, endereco_entrega, clientes(nome, telefone)")
      .eq("id", pedidoId)
      .single();

    if (!pedido) return;

    const cliente = pedido.clientes as { nome: string; telefone: string } | null;
    if (!cliente) return;

    await _enviarNotificacoes(
      cliente.nome,
      cliente.telefone,
      pedido.numero_pedido,
      pedido.itens ?? [],
      pedido.endereco_entrega ?? "",
      etapa
    );
  } catch (err) {
    console.error("[whatsapp] notificarEtapaPedido:", err);
  }
}

// ─── Lógica compartilhada ──────────────────────────────────────────────────

async function _enviarNotificacoes(
  nome: string,
  telefone: string,
  numeroPedido: number | null,
  itens: ItemPedido[],
  endereco: string,
  etapa: "separacao" | "em_rota"
) {
  const numFormatado = numeroPedido ? formatarNumeroPedido(numeroPedido) : "";
  const pedidoLabel = numFormatado ? `pedido ${numFormatado}` : "pedido";

  let msgCliente: string;
  let msgGrupo: string;

  if (etapa === "separacao") {
    msgCliente =
      `Olá ${nome}! Seu ${pedidoLabel} está sendo separado. ` +
      `Em breve você receberá uma mensagem quando sair para entrega.`;

    msgGrupo =
      `📦 ${numFormatado ? numFormatado + " — " : ""}${nome} | SEPARAÇÃO` +
      (itens.length ? `\nItens: ${formatarItens(itens)}` : "");
  } else {
    msgCliente =
      `${nome}, seu ${pedidoLabel} saiu para entrega! 🚚` +
      (endereco ? `\nEndereço: ${endereco}` : "") +
      `\nAguarde a chegada!`;

    msgGrupo =
      `🚚 ${numFormatado ? numFormatado + " — " : ""}${nome} | EM ROTA` +
      (endereco ? `\nDestino: ${endereco}` : "");
  }

  // Envia para cliente e grupo em paralelo — falha silenciosa em cada um
  await Promise.allSettled([
    enviarWhatsApp(telefone, msgCliente),
    enviarWhatsApp(GRUPO_JID, msgGrupo),
  ]);
}
