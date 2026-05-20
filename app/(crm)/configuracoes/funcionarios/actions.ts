"use server";

import { revalidatePath } from "next/cache";
import { isAdminUser } from "@/lib/auth/papel";
import {
  adicionarFuncionario,
  toggleAtivoFuncionario,
  removerFuncionario,
} from "@/lib/supabase/queries/funcionarios";

async function assertAdmin() {
  if (!(await isAdminUser())) throw new Error("Acesso negado");
}

export async function adicionarFuncionarioAction(formData: FormData) {
  await assertAdmin();

  const nome = (formData.get("nome") as string ?? "").trim();
  const raw = (formData.get("telefone") as string ?? "").trim();
  const telefone = raw.replace(/\D/g, "");

  if (!nome) throw new Error("Informe o nome do funcionário");
  if (telefone.length < 10)
    throw new Error("Telefone inválido — use DDI + DDD + número (ex: 5511999999999)");

  await adicionarFuncionario(nome, telefone);
  revalidatePath("/configuracoes/funcionarios");
}

export async function toggleAtivoAction(id: string, ativo: boolean) {
  await assertAdmin();
  await toggleAtivoFuncionario(id, ativo);
  revalidatePath("/configuracoes/funcionarios");
}

export async function removerFuncionarioAction(id: string) {
  await assertAdmin();
  await removerFuncionario(id);
  revalidatePath("/configuracoes/funcionarios");
}
