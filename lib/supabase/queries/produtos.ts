import { createClient } from "@/lib/supabase/server";
import type { Produto } from "@/lib/types";

export async function getProdutos() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  if (error) throw error;
  return data as Produto[];
}

export async function getProdutoById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Produto;
}

export async function updatePrecoProduto(id: string, preco_atual: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("produtos")
    .update({ preco_atual })
    .eq("id", id);

  if (error) throw error;
}

export interface ProdutoUpdatePayload {
  preco_atual: number;
  estoque_atual: number;
  ativo: boolean;
}

export async function updateProduto(id: string, payload: ProdutoUpdatePayload) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("produtos")
    .update(payload)
    .eq("id", id);
  if (error) throw error;
}

export interface LinhaPlanilha {
  produto_id: string;
  preco_atual: number;
  estoque_atual: number;
}

export async function upsertProdutosEmLote(linhas: LinhaPlanilha[]) {
  const supabase = await createClient();
  await Promise.all(
    linhas.map(({ produto_id, preco_atual, estoque_atual }) =>
      supabase
        .from("produtos")
        .update({ preco_atual, estoque_atual })
        .eq("id", produto_id)
        .throwOnError()
    )
  );
}
