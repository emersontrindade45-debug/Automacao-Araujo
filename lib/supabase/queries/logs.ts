import { createClient } from "@/lib/supabase/server";
import type { LogEvento } from "@/lib/types";

export async function getLogsByCliente(clienteId: string): Promise<LogEvento[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("logs")
    .select("*")
    .eq("payload->>cliente_id", clienteId)
    .order("criado_em", { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as LogEvento[];
}
