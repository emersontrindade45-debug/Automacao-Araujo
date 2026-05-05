"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ConfigFollowUp {
  dias_inatividade: number;
  max_tentativas: number;
  mensagem: string;
}

export async function salvarConfigFollowUpAction(config: ConfigFollowUp) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (user?.app_metadata?.papel !== "admin") {
    throw new Error("Acesso não autorizado");
  }

  const { error } = await supabase
    .from("configuracoes")
    .upsert(
      { chave: "followup", valor: config },
      { onConflict: "chave" }
    );

  if (error) throw error;

  revalidatePath("/configuracoes");
}

export async function getConfigFollowUp(): Promise<ConfigFollowUp> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("configuracoes")
    .select("valor")
    .eq("chave", "followup")
    .single();

  return (data?.valor as ConfigFollowUp | null) ?? {
    dias_inatividade: 3,
    max_tentativas: 3,
    mensagem: "Olá! Vimos que você ainda não finalizou seu pedido. Podemos ajudar?",
  };
}
