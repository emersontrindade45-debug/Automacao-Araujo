"use server";

import { updateEtapaCliente } from "@/lib/supabase/queries/clientes";
import { revalidatePath } from "next/cache";
import type { Etapa } from "@/lib/types";

export async function moverEtapaAction(clienteId: string, etapa: Etapa) {
  await updateEtapaCliente(clienteId, etapa);
  revalidatePath("/kanban");
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clienteId}`);
}
