"use server";

import { updateStatusPreco } from "@/lib/supabase/queries/precos";
import { revalidatePath } from "next/cache";
import type { StatusPreco } from "@/lib/types";

export async function atualizarStatusPrecoAction(precoId: string, status: StatusPreco) {
  await updateStatusPreco(precoId, status);
  revalidatePath("/precos");
}
