"use server";

import { updateStatusPreco, aprovarPreco } from "@/lib/supabase/queries/precos";
import { updateProduto, upsertProdutosEmLote } from "@/lib/supabase/queries/produtos";
import type { LinhaPlanilha } from "@/lib/supabase/queries/produtos";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispararWebhookN8n } from "@/lib/n8n/client";

export async function aprovarPrecoAction(precoId: string) {
  const supabase = createAdminClient();
  const { data: registro } = await supabase
    .from("precos")
    .select("preco_novo, solicitado_por, telefone, produtos(nome)")
    .eq("id", precoId)
    .single();

  await aprovarPreco(precoId);
  revalidatePath("/precos");

  if (registro) {
    const produtoRaw = registro.produtos;
    const produto = (Array.isArray(produtoRaw) ? produtoRaw[0] : produtoRaw) as { nome: string } | null;
    await dispararWebhookN8n("price-update", {
      produto_nome: produto?.nome ?? "",
      preco_novo: registro.preco_novo,
      solicitado_por: registro.solicitado_por ?? "",
      telefone: registro.telefone ?? "",
    });
  }
}

export async function rejeitarPrecoAction(precoId: string) {
  await updateStatusPreco(precoId, "rejeitado");
  revalidatePath("/precos");
}

export async function alterarStatusPrecoAction(precoId: string, status: import("@/lib/types").StatusPreco) {
  if (status === "aprovado") {
    await aprovarPreco(precoId);
  } else {
    await updateStatusPreco(precoId, status);
  }
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
