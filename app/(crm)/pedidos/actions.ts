"use server";

import { updateStatusPedido } from "@/lib/supabase/queries/pedidos";
import { revalidatePath } from "next/cache";
import type { Etapa } from "@/lib/types";

export async function confirmarPedidoAction(pedidoId: string, status: Etapa) {
  await updateStatusPedido(pedidoId, status);
  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${pedidoId}`);
}
