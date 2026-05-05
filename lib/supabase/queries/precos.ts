import { createClient } from "@/lib/supabase/server";
import type { StatusPreco } from "@/lib/types";

export interface AtualizacaoPreco {
  id: string;
  produto_id: string;
  preco_novo: number;
  status: StatusPreco;
  solicitado_por: string | null;
  criado_em: string;
  produtos: { nome: string; preco_atual: number; unidade: string };
}

export async function getAtualizacoesPreco() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("precos")
    .select("*, produtos(nome, preco_atual, unidade)")
    .order("criado_em", { ascending: false });

  if (error) throw error;
  return data as AtualizacaoPreco[];
}

export async function getPrecosPendentes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("precos")
    .select("*, produtos(nome, preco_atual, unidade)")
    .eq("status", "pendente")
    .order("criado_em", { ascending: false });

  if (error) throw error;
  return data as AtualizacaoPreco[];
}

export async function countPrecosPendentes() {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("precos")
    .select("*", { count: "exact", head: true })
    .eq("status", "pendente");

  if (error) throw error;
  return count ?? 0;
}

export async function updateStatusPreco(id: string, status: StatusPreco) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("precos")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
}
