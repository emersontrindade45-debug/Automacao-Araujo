"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function getRequestOrigin(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (envUrl) return envUrl;
  return "http://localhost:3000";
}

async function getOriginFromHeaders(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return getRequestOrigin();
}

/** Envia e-mail de redefinição (fluxo público, sem revelar se o e-mail existe). */
export async function solicitarRedefinicaoSenha(formData: FormData) {
  const email = ((formData.get("email_recuperacao") as string) ?? "").trim().toLowerCase();
  if (!email) {
    redirect("/login?recuperacao=invalido");
  }

  const origin = await getOriginFromHeaders();
  const redirectTo = `${origin}/redefinir-senha`;

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  redirect("/login?recuperacao=enviado");
}

export async function login(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    redirect("/login?error=credenciais_invalidas");
  }

  redirect("/kanban");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
