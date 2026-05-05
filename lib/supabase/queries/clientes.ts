import { createClient } from "@/lib/supabase/server";
import type { Cliente, Etapa, CanalOrigem } from "@/lib/types";

export async function getClientes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("atualizado_em", { ascending: false });

  if (error) throw error;
  return data as Cliente[];
}

export async function getClienteById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Cliente;
}

export async function getClientesByEtapa(etapa: Etapa) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("etapa_atual", etapa)
    .order("atualizado_em", { ascending: false });

  if (error) throw error;
  return data as Cliente[];
}

export async function getClientesAgrupadosPorEtapa() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("atualizado_em", { ascending: false });

  if (error) throw error;

  const clientes = data as Cliente[];
  const agrupados = new Map<Etapa, Cliente[]>();

  for (const cliente of clientes) {
    const etapa = cliente.etapa_atual;
    if (!agrupados.has(etapa)) agrupados.set(etapa, []);
    agrupados.get(etapa)!.push(cliente);
  }

  return agrupados;
}

export async function updateEtapaCliente(id: string, etapa: Etapa) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clientes")
    .update({ etapa_atual: etapa })
    .eq("id", id);

  if (error) throw error;
}

export async function upsertCliente(dados: {
  nome: string;
  telefone: string;
  canal_origem: CanalOrigem;
  etapa_atual?: Etapa;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .upsert({ ...dados, etapa_atual: dados.etapa_atual ?? "novo" }, {
      onConflict: "telefone",
    })
    .select()
    .single();

  if (error) throw error;
  return data as Cliente;
}
