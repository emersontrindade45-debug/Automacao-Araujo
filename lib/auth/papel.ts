import type { Papel } from "@/lib/types";

/** Normaliza o valor de app_metadata.papel para exibição e lógica de UI (apenas admin | atendimento). */
export function normalizePapel(raw: unknown): Papel {
  return raw === "admin" ? "admin" : "atendimento";
}
