"use server";

import { getClienteById, updateEtapaCliente } from "@/lib/supabase/queries/clientes";
import { getPedidosByCliente, updateStatusPedido, updateValorFinal } from "@/lib/supabase/queries/pedidos";
import { dispararWebhookN8n } from "@/lib/n8n/client";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Etapa } from "@/lib/types";

const ETAPAS_COM_NOTIFICACAO: Etapa[] = ["pedido_gerado", "separacao", "em_rota", "entregue", "pos_venda"];

const ETAPAS_COM_PEDIDO: Etapa[] = ["pedido_gerado", "separacao", "em_rota", "entregue", "pos_venda"];

export async function moverEtapaAction(clienteId: string, etapa: Etapa, valorFinal?: number) {
  await updateEtapaCliente(clienteId, etapa);

  // Sincroniza status do pedido ativo com a etapa do kanban
  let pedidoAtivoId: string | undefined;
  if (ETAPAS_COM_PEDIDO.includes(etapa)) {
    const pedidos = await getPedidosByCliente(clienteId);
    const pedidoAtivo = pedidos.find((p) =>
      ["pedido_gerado", "separacao", "em_rota", "entregue", "pos_venda"].includes(p.status)
    ) ?? pedidos[0];
    if (pedidoAtivo) {
      pedidoAtivoId = pedidoAtivo.id;
      await updateStatusPedido(pedidoAtivo.id, etapa);
      if (etapa === "em_rota" && valorFinal != null) {
        await updateValorFinal(pedidoAtivo.id, valorFinal);
      }
    }
  }

  revalidatePath("/kanban");
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/pedidos");
  if (pedidoAtivoId) revalidatePath(`/pedidos/${pedidoAtivoId}`);

  if (ETAPAS_COM_NOTIFICACAO.includes(etapa)) {
    notificarEtapa(clienteId, etapa, valorFinal).catch(() => {});
  }
}

async function notificarEtapa(clienteId: string, etapa: Etapa, valorFinal?: number) {
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
    ...(etapa === "em_rota" && valorFinal != null ? { valor_final: valorFinal } : {}),
  });
}

export async function getStatusIAAction(telefone: string): Promise<"ativa" | "pausada"> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dados_cliente")
    .select("atendimento_ia")
    .eq("telefone", telefone)
    .single();

  if (data?.atendimento_ia?.startsWith("pause")) return "pausada";
  return "ativa";
}

export async function pausarIAAction(telefone: string) {
  const supabase = await createClient();
  await supabase
    .from("dados_cliente")
    .update({ atendimento_ia: "pause" })
    .eq("telefone", telefone);
}

export async function reativarIAAction(telefone: string) {
  const supabase = await createClient();
  await supabase
    .from("dados_cliente")
    .update({ atendimento_ia: "reativada" })
    .eq("telefone", telefone);
}
