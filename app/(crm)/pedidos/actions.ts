"use server";

import { updateStatusPedido } from "@/lib/supabase/queries/pedidos";
import { notificarEtapaPedido } from "@/lib/whatsapp/notificacoes";
import { revalidatePath } from "next/cache";
import type { Etapa } from "@/lib/types";

export async function confirmarPedidoAction(pedidoId: string, status: Etapa) {
  await updateStatusPedido(pedidoId, status);
  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${pedidoId}`);

  // Notifica cliente e grupo sem bloquear a resposta
  notificarEtapaPedido(pedidoId, status).catch((err) =>
    console.error("[confirmarPedidoAction] notificação falhou:", err)
  );
}
