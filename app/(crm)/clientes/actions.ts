"use server";

import { updateEtapaCliente } from "@/lib/supabase/queries/clientes";
import { notificarEtapaCliente } from "@/lib/whatsapp/notificacoes";
import { revalidatePath } from "next/cache";
import type { Etapa } from "@/lib/types";

export async function moverEtapaAction(clienteId: string, etapa: Etapa) {
  await updateEtapaCliente(clienteId, etapa);
  revalidatePath("/kanban");
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clienteId}`);

  // Notifica cliente e grupo sem bloquear a resposta
  notificarEtapaCliente(clienteId, etapa).catch((err) =>
    console.error("[moverEtapaAction] notificação falhou:", err)
  );
}
