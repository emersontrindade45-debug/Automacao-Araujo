import { createClient } from "@/lib/supabase/server";
import type { Papel } from "@/lib/types";

/** Normaliza o valor de app_metadata.papel para exibição e lógica de UI (apenas admin | atendimento). */
export function normalizePapel(raw: unknown): Papel {
  return raw === "admin" ? "admin" : "atendimento";
}

/**
 * Returns the authenticated user from the current session JWT.
 * app_metadata (including `papel`) is only available in the session token,
 * not in the getUser() response from the anon client.
 */
export async function getSessionUser() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}

/** Returns true if the current session user has the admin role. */
export async function isAdminUser(): Promise<boolean> {
  const user = await getSessionUser();
  return user?.app_metadata?.papel === "admin";
}
