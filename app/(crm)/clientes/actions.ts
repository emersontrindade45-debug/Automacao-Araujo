"use server";

import { getClienteById, updateEtapaCliente } from "@/lib/supabase/queries/clientes";
import { getPedidosByCliente, updateStatusPedido } from "@/lib/supabase/queries/pedidos";
import { dispararWebhookN8n } from "@/lib/n8n/client";
import { revalidatePath } from "next/cache";
import type { Etapa } from "@/lib/types";

const ETAPAS_COM_NOTIFICACAO: Etapa[] = ["pedido_gerado", "separacao", "em_rota", "entregue", "pos_venda"];

const ETAPAS_COM_PEDIDO: Etapa[] = ["pedido_gerado", "separacao", "em_rota", "entregue", "pos_venda"];

export async function moverEtapaAction(clienteId: string, etapa: Etapa) {
  await updateEtapaCliente(clienteId, etapa);

  // Sincroniza status do pedido ativo com a etapa do kanban
  if (ETAPAS_COM_PEDIDO.includes(etapa)) {
    const pedidos = await getPedidosByCliente(clienteId);
    const pedidoAtivo = pedidos.find((p) =>
      ["pedido_gerado", "separacao", "em_rota", "entregue", "pos_venda"].includes(p.status)
    ) ?? pedidos[0];
    if (pedidoAtivo) {
      await updateStatusPedido(pedidoAtivo.id, etapa);
    }
  }

  revalidatePath("/kanban");
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/pedidos");

  if (ETAPAS_COM_NOTIFICACAO.includes(etapa)) {
    notificarEtapa(clienteId, etapa).catch(() => {});
  }
}

async function notificarEtapa(clienteId: string, etapa: Etapa) {
  const [cliente, pedidos] = await Promise.all([
    getClienteById(clienteId),
    getPedidosByCliente(clienteId),
  ]);

  const pedidoAtivo = pedidos.find((p) =>
    ["pedido_gerado", "separacao", "em_rota", "entregue", "pos_venda"].includes(p.status)
  ) ?? pedidos[0];

  await dispararWebhookN8n("notificacao-etapa", {
    tipo: etapa,
    nome: cliente.nome,
    telefone: cliente.telefone,
    numero_pedido: pedidoAtivo?.numero_pedido ?? "",
    itens: pedidoAtivo?.itens ?? [],
  });
}
