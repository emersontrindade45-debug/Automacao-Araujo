"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ConfigFollowUp {
  dias_inatividade: number;
  max_tentativas: number;
  mensagem: string;
  mensagens: string[];
  intervalos_dias: number[];
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
  revalidatePath("/configuracoes/follow-up");
}

export async function getConfigFollowUp(): Promise<ConfigFollowUp> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("configuracoes")
    .select("valor")
    .eq("chave", "followup")
    .single();

  const raw = data?.valor as Partial<ConfigFollowUp> | null;

  return {
    dias_inatividade: raw?.dias_inatividade ?? 1,
    max_tentativas: raw?.max_tentativas ?? 3,
    mensagem: raw?.mensagem ?? "Olá! Vimos que você ainda não finalizou seu atendimento. Podemos ajudar?",
    mensagens: raw?.mensagens ?? [
      "Olá, {nome}! Passou por aqui mas não finalizou. Posso te ajudar com alguma coisa?",
      "{nome}, ainda estamos aqui! Temos ótimas opções hoje. Posso te mostrar nossas ofertas?",
      "{nome}, última chance de aproveitar nossas ofertas desta semana. Posso ajudar?",
    ],
    intervalos_dias: raw?.intervalos_dias ?? [1, 2, 3],
  };
}
