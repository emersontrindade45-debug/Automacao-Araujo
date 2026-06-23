import { createAdminClient } from "@/lib/supabase/admin";
import type { Papel } from "@/lib/types";

export interface UsuarioItem {
  id: string;
  email: string;
  nome: string;
  papel: Papel;
  criado_em: string;
}

export async function listarUsuarios(): Promise<UsuarioItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;

  return data.users.map((u) => ({
    id: u.id,
    email: u.email ?? "",
    nome: (u.user_metadata?.nome as string | undefined) ?? u.email?.split("@")[0] ?? "Usuário",
    papel: (u.app_metadata?.papel === "admin" ? "admin" : "atendimento") as Papel,
    criado_em: u.created_at,
  }));
}

export async function convidarUsuario(email: string, nome: string, papel: Papel, redirectTo: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { nome, papel },
  });
  console.log("[convite] inviteUserByEmail resultado →", {
    redirectTo,
    actionLink: data?.user?.action_link ?? null,
    error: error?.message ?? null,
  });
  if (error) throw error;
}

export async function alterarPapelUsuario(userId: string, papel: Papel) {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { papel },
  });
  if (error) throw error;
}

export async function removerUsuario(userId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw error;
}
