import { createClient } from "@/lib/supabase/server";
import type { Cliente, Etapa, CanalOrigem } from "@/lib/types";

export async function getClientes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("atualizado_em", { ascending: false });

  if (error) throw error;
  const clientes = data as Cliente[];

  // Busca o endereço do pedido mais recente por cliente
  const ids = clientes.map((c) => c.id);
  if (ids.length === 0) return clientes;

  // PostgREST rejeita URLs muito longas — com muitos clientes o filtro .in()
  // excederia o limite de tamanho de URL, por isso a busca é paginada em lotes.
  const TAMANHO_LOTE = 100;
  const pedidos: { cliente_id: string; endereco_entrega: string | null; criado_em: string }[] = [];
  for (let i = 0; i < ids.length; i += TAMANHO_LOTE) {
    const lote = ids.slice(i, i + TAMANHO_LOTE);
    const { data: pedidosLote } = await supabase
      .from("pedidos")
      .select("cliente_id, endereco_entrega, criado_em")
      .in("cliente_id", lote)
      .not("endereco_entrega", "is", null)
      .neq("endereco_entrega", "")
      .order("criado_em", { ascending: false });
    if (pedidosLote) pedidos.push(...pedidosLote);
  }

  const enderecoMap = new Map<string, string>();
  for (const p of pedidos) {
    if (!enderecoMap.has(p.cliente_id) && p.endereco_entrega) {
      enderecoMap.set(p.cliente_id, p.endereco_entrega);
    }
  }

  return clientes.map((c) => ({
    ...c,
    endereco_entrega: enderecoMap.get(c.id) ?? null,
  }));
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
