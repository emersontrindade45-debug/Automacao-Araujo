"use server";

import { updateStatusPreco, aprovarPreco } from "@/lib/supabase/queries/precos";
import { updateProduto, upsertProdutosEmLote } from "@/lib/supabase/queries/produtos";
import type { LinhaPlanilha } from "@/lib/supabase/queries/produtos";
import { revalidatePath } from "next/cache";

export async function aprovarPrecoAction(precoId: string) {
  await aprovarPreco(precoId);
  revalidatePath("/precos");
}

export async function rejeitarPrecoAction(precoId: string) {
  await updateStatusPreco(precoId, "rejeitado");
  revalidatePath("/precos");
}

export async function editarProdutoAction(
  id: string,
  payload: { preco_atual: number; estoque_atual: number; ativo: boolean }
) {
  await updateProduto(id, payload);
  revalidatePath("/precos");
}

export async function importarProdutosAction(linhas: LinhaPlanilha[]) {
  await upsertProdutosEmLote(linhas);
  revalidatePath("/precos");
}
