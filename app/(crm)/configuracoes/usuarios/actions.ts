"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { convidarUsuario, alterarPapelUsuario, removerUsuario } from "@/lib/supabase/queries/usuarios";
import type { Papel } from "@/lib/types";
import { revalidatePath } from "next/cache";

async function getRedirectBase(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const base = host
    ? `${proto}://${host}`
    : process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  console.log("[convite] getRedirectBase →", { host, proto, base });
  return base;
}

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const papel = user?.app_metadata?.papel;
  if (papel !== "admin") {
    console.error("[assertAdmin] acesso negado — papel atual no JWT:", papel, "| userId:", user?.id);
    throw new Error("Acesso negado — faça logout e login novamente para atualizar sua sessão.");
  }
}

export async function convidarUsuarioAction(formData: FormData) {
  await assertAdmin();

  const email = (formData.get("email") as string ?? "").trim().toLowerCase();
  const nome = (formData.get("nome") as string ?? "").trim();
  const papel = (formData.get("papel") as Papel) === "admin" ? "admin" : "atendimento";

  if (!email || !nome) throw new Error("Email e nome são obrigatórios");

  const base = await getRedirectBase();
  const redirectTo = `${base}/redefinir-senha`;
  console.log("[convite] enviando convite →", { email, redirectTo });
  await convidarUsuario(email, nome, papel, redirectTo);

  revalidatePath("/configuracoes/usuarios");
}

export async function alterarPapelAction(formData: FormData) {
  await assertAdmin();

  const userId = formData.get("userId") as string;
  const papel = (formData.get("papel") as Papel) === "admin" ? "admin" : "atendimento";

  if (!userId) throw new Error("ID do usuário obrigatório");

  await alterarPapelUsuario(userId, papel);
  revalidatePath("/configuracoes/usuarios");
}

export async function removerUsuarioAction(formData: FormData) {
  await assertAdmin();

  const userId = formData.get("userId") as string;
  if (!userId) throw new Error("ID do usuário obrigatório");

  await removerUsuario(userId);
  revalidatePath("/configuracoes/usuarios");
}
