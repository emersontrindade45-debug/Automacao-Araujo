import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Produto, TipoProduto } from "@/lib/types";

export async function getProdutos() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("produtos")
    .select("*")
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
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("produtos")
    .update({ preco_atual })
    .eq("id", id);

  if (error) throw error;
}

export interface ProdutoUpdatePayload {
  preco_atual: number;
  ativo: boolean;
}

export async function updateProduto(id: string, payload: ProdutoUpdatePayload) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("produtos")
    .update(payload)
    .eq("id", id);
  if (error) throw error;
}

export interface LinhaPlanilha {
  nome: string;
  unidade: string;
  preco_atual: number;
  categoria: string | null;
  nicho: string | null;
  validade: string | null;
}

export async function getOfertasEKits() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("produtos")
    .select("id, nome, preco_atual, unidade, tipo, descricao, validade, categoria, ativo, criado_em, nicho, imagem_url")
    .in("tipo", ["oferta", "kit"])
    .order("tipo")
    .order("nome");

  if (error) throw error;
  return data as Produto[];
}

export interface OfertaKitPayload {
  nome: string;
  preco_atual: number;
  unidade: string;
  tipo: TipoProduto;
  descricao: string | null;
  validade: string | null;
  categoria: string;
  ativo: boolean;
  nicho: string | null;
}

export async function criarOfertaKit(payload: OfertaKitPayload) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("produtos")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as Produto;
}

export async function atualizarOfertaKit(id: string, payload: Partial<OfertaKitPayload>) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("produtos")
    .update(payload)
    .eq("id", id);

  if (error) throw error;
}

export async function deletarOfertaKit(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("produtos")
    .delete()
    .eq("id", id)
    .in("tipo", ["oferta", "kit"]);

  if (error) throw error;
}

// Itens da planilha com categoria "ofertas"/"kits" são classificados como
// oferta/kit para aparecerem na página Ofertas e Kits (tipo default do banco é "produto").
function tipoDaCategoria(categoria: string | null): TipoProduto {
  if (categoria === "ofertas") return "oferta";
  if (categoria === "kits") return "kit";
  return "produto";
}

export async function upsertProdutosEmLote(linhas: LinhaPlanilha[]) {
  const supabase = createAdminClient();

  await Promise.all(
    linhas.map(({ nome, unidade, preco_atual, categoria, nicho, validade }) => {
      const categoriaNorm = categoria?.trim().toLowerCase() || null;
      return supabase
        .from("produtos")
        .upsert(
          {
            nome,
            unidade,
            preco_atual,
            ativo: true,
            tipo: tipoDaCategoria(categoriaNorm),
            categoria: categoriaNorm,
            validade: validade || null,
            // nicho vazio na planilha NÃO apaga o nicho existente —
            // só atualiza quando preenchido (acougue/padaria/churrasco)
            ...(nicho ? { nicho } : {}),
          },
          { onConflict: "nome", ignoreDuplicates: false }
        )
        .throwOnError();
    })
  );

  const nomesImportados = new Set(linhas.map((l) => l.nome));

  const { data: existentes } = await supabase
    .from("produtos")
    .select("id, nome")
    .eq("tipo", "produto");

  const idsParaRemover = (existentes ?? [])
    .filter((p) => !nomesImportados.has(p.nome))
    .map((p) => p.id);

  if (idsParaRemover.length > 0) {
    await supabase
      .from("produtos")
      .delete()
      .in("id", idsParaRemover)
      .throwOnError();
  }
}
