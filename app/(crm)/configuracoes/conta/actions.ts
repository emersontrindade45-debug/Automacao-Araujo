"use server";

import { createClient } from "@/lib/supabase/server";

export async function atualizarSenhaLogadoAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Sessão expirada. Entre novamente.");
  }

  const nova = (formData.get("nova_senha") as string)?.trim() ?? "";
  const confirmar = (formData.get("confirmar_senha") as string)?.trim() ?? "";

  if (nova.length < 8) {
    throw new Error("A nova senha deve ter pelo menos 8 caracteres.");
  }
  if (nova !== confirmar) {
    throw new Error("A confirmação não coincide com a nova senha.");
  }

  const { error } = await supabase.auth.updateUser({ password: nova });
  if (error) {
    throw new Error(error.message || "Não foi possível atualizar a senha.");
  }
}
