"use server";

import { getPedidoById, updateStatusPedido, updateValorFinal } from "@/lib/supabase/queries/pedidos";
import { updateEtapaCliente } from "@/lib/supabase/queries/clientes";
import { dispararWebhookN8n } from "@/lib/n8n/client";
import { revalidatePath } from "next/cache";
import type { Etapa } from "@/lib/types";

const ETAPAS_COM_NOTIFICACAO: Etapa[] = ["pedido_gerado", "separacao", "em_rota", "entregue", "pos_venda"];

export async function confirmarPedidoAction(pedidoId: string, status: Etapa, valorFinal?: number) {
  await updateStatusPedido(pedidoId, status);

  if (status === "em_rota" && valorFinal != null) {
    await updateValorFinal(pedidoId, valorFinal);
  }

  // Sincroniza etapa do cliente com o status do pedido
  const pedido = await getPedidoById(pedidoId);
  const clienteId = pedido.cliente_id;
  await updateEtapaCliente(clienteId, status);

  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/kanban");
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clienteId}`);

  if (ETAPAS_COM_NOTIFICACAO.includes(status)) {
    notificarEtapaPedido(pedidoId, status, valorFinal).catch((err) => {
      console.error("[n8n] Falha ao notificar etapa:", err);
    });
  }
}

async function notificarEtapaPedido(pedidoId: string, status: Etapa, valorFinal?: number) {
  const pedido = await getPedidoById(pedidoId);

  await dispararWebhookN8n("notificacao-etapa", {
    tipo: status,
    nome: pedido.clientes.nome,
    telefone: pedido.clientes.telefone,
    numero_pedido: pedido.numero_pedido ?? "",
    itens: pedido.itens ?? [],
    ...(status === "em_rota" && valorFinal != null ? { valor_final: valorFinal } : {}),
  });
}
