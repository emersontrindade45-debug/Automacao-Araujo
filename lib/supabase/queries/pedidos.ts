import { createClient } from "@/lib/supabase/server";
import type { Pedido, Etapa } from "@/lib/types";

export async function getPedidos() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pedidos")
    .select("*, clientes(nome, telefone, canal_origem)")
    .order("criado_em", { ascending: false });

  if (error) throw error;
  const rows = data as (Pedido & { clientes: { nome: string; telefone: string; canal_origem: string } })[];
  return rows.map((p) => ({
    ...p,
    itens: Array.isArray(p.itens)
      ? p.itens
      : typeof p.itens === "string"
        ? (() => { try { return JSON.parse(p.itens as unknown as string); } catch { return []; } })()
        : [],
  }));
}

export async function getPedidoById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pedidos")
    .select("*, clientes(nome, telefone, canal_origem)")
    .eq("id", id)
    .single();

  if (error) throw error;
  const p = data as Pedido & { clientes: { nome: string; telefone: string; canal_origem: string } };
  return {
    ...p,
    itens: Array.isArray(p.itens)
      ? p.itens
      : typeof p.itens === "string"
        ? (() => { try { return JSON.parse(p.itens as unknown as string); } catch { return []; } })()
        : [],
  };
}

export async function getPedidosByCliente(clienteId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("criado_em", { ascending: false });

  if (error) throw error;
  return data as Pedido[];
}

export async function updateStatusPedido(id: string, status: Etapa) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pedidos")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
}

export async function updateValorFinal(id: string, valor_final: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pedidos")
    .update({ valor_final })
    .eq("id", id);

  if (error) throw error;
}
