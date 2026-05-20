import { createAdminClient } from "@/lib/supabase/admin";

export interface FuncionarioItem {
  id: string;
  nome: string;
  telefone: string;
  ativo: boolean;
  criado_em: string;
}

export async function listarFuncionarios(): Promise<FuncionarioItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("funcionarios_autorizados")
    .select("id, nome, telefone, ativo, criado_em")
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return data as FuncionarioItem[];
}

export async function adicionarFuncionario(nome: string, telefone: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("funcionarios_autorizados")
    .insert({ nome, telefone });
  if (error) {
    if (error.code === "23505") throw new Error("Este número já está cadastrado");
    throw error;
  }
}

export async function toggleAtivoFuncionario(id: string, ativo: boolean): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("funcionarios_autorizados")
    .update({ ativo })
    .eq("id", id);
  if (error) throw error;
}

export async function removerFuncionario(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("funcionarios_autorizados")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
