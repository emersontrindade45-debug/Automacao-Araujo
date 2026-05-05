"use server";

import { updateStatusPreco, aprovarPreco } from "@/lib/supabase/queries/precos";
import { revalidatePath } from "next/cache";

export async function aprovarPrecoAction(precoId: string) {
  await aprovarPreco(precoId);
  revalidatePath("/precos");
}

export async function rejeitarPrecoAction(precoId: string) {
  await updateStatusPreco(precoId, "rejeitado");
  revalidatePath("/precos");
}
