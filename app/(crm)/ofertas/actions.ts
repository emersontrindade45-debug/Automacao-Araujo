"use server";

import { revalidatePath } from "next/cache";
import {
  criarOfertaKit,
  atualizarOfertaKit,
  deletarOfertaKit,
  type OfertaKitPayload,
} from "@/lib/supabase/queries/produtos";

export async function criarOfertaKitAction(payload: OfertaKitPayload) {
  await criarOfertaKit(payload);
  revalidatePath("/ofertas");
}

export async function atualizarOfertaKitAction(id: string, payload: Partial<OfertaKitPayload>) {
  await atualizarOfertaKit(id, payload);
  revalidatePath("/ofertas");
}

export async function deletarOfertaKitAction(id: string) {
  await deletarOfertaKit(id);
  revalidatePath("/ofertas");
}
