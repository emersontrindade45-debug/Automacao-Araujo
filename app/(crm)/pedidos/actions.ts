"use server";

import { getPedidoById, updateStatusPedido } from "@/lib/supabase/queries/pedidos";
import { dispararWebhookN8n } from "@/lib/n8n/client";
import { revalidatePath } from "next/cache";
import type { Etapa } from "@/lib/types";

const ETAPAS_COM_NOTIFICACAO: Etapa[] = ["pedido_gerado", "separacao", "em_rota", "entregue", "pos_venda"];

export async function confirmarPedidoAction(pedidoId: string, status: Etapa) {
  await updateStatusPedido(pedidoId, status);
  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${pedidoId}`);

  if (ETAPAS_COM_NOTIFICACAO.includes(status)) {
    notificarEtapaPedido(pedidoId, status).catch(() => {});
  }
}

async function notificarEtapaPedido(pedidoId: string, status: Etapa) {
  const pedido = await getPedidoById(pedidoId);

  await dispararWebhookN8n("notificacao-etapa", {
    tipo: status,
    nome: pedido.clientes.nome,
    telefone: pedido.clientes.telefone,
    numero_pedido: pedido.numero_pedido ?? "",
    itens: pedido.itens ?? [],
  });
}
