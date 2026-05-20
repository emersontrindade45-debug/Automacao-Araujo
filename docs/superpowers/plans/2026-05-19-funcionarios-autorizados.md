# Funcionários Autorizados — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a página `/configuracoes/funcionarios` no hub para o admin gerenciar quais funcionários (por número de WhatsApp) podem solicitar alterações de preço.

**Architecture:** Server Component page + Client Components (form e list) + Server Actions + query helpers — padrão idêntico ao já existente em `/configuracoes/usuarios`. A tabela `funcionarios_autorizados` já existe no Supabase.

**Tech Stack:** Next.js App Router, Supabase (admin client), Server Actions, Tailwind CSS, TypeScript

---

## Mapa de arquivos

| Arquivo | Ação |
|---------|------|
| `lib/supabase/queries/funcionarios.ts` | Criar — query helpers CRUD |
| `app/(crm)/configuracoes/funcionarios/actions.ts` | Criar — Server Actions |
| `app/(crm)/configuracoes/funcionarios/funcionarios-form.tsx` | Criar — form de adição |
| `app/(crm)/configuracoes/funcionarios/funcionarios-list.tsx` | Criar — lista com toggle e remover |
| `app/(crm)/configuracoes/funcionarios/page.tsx` | Criar — Server Component da página |
| `components/configuracoes/settings-nav.tsx` | Modificar — adicionar item no navAdmin |

---

## Task 1: Query helpers

**Files:**
- Create: `lib/supabase/queries/funcionarios.ts`

- [ ] **Criar o arquivo com os 4 helpers:**

```ts
import { createAdminClient } from "@/lib/supabase/admin";

export interface FuncionarioItem {
  id: string;
  nome: string;
  telefone: string;
  ativo: boolean;
  criado_em: string;
}

export async function listarFuncionarios(): Promise<FuncionarioItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("funcionarios_autorizados")
    .select("id, nome, telefone, ativo, criado_em")
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return data as FuncionarioItem[];
}

export async function adicionarFuncionario(nome: string, telefone: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("funcionarios_autorizados")
    .insert({ nome, telefone });
  if (error) {
    if (error.code === "23505") throw new Error("Este número já está cadastrado");
    throw error;
  }
}

export async function toggleAtivoFuncionario(id: string, ativo: boolean): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("funcionarios_autorizados")
    .update({ ativo })
    .eq("id", id);
  if (error) throw error;
}

export async function removerFuncionario(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("funcionarios_autorizados")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
```

- [ ] **Verificar TypeScript:**

```bash
npx tsc --noEmit
```

Esperado: sem erros relacionados ao novo arquivo.

- [ ] **Commit:**

```bash
git add lib/supabase/queries/funcionarios.ts
git commit -m "feat: query helpers para funcionarios_autorizados"
```

---

## Task 2: Server Actions

**Files:**
- Create: `app/(crm)/configuracoes/funcionarios/actions.ts`

- [ ] **Criar o arquivo:**

```ts
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
```

- [ ] **Verificar TypeScript:**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Commit:**

```bash
git add app/\(crm\)/configuracoes/funcionarios/actions.ts
git commit -m "feat: server actions para funcionarios autorizados"
```

---

## Task 3: Formulário de adição

**Files:**
- Create: `app/(crm)/configuracoes/funcionarios/funcionarios-form.tsx`

- [ ] **Criar o componente:**

```tsx
"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adicionarFuncionarioAction } from "./actions";

export function FuncionariosForm() {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMsg(null);
    startTransition(async () => {
      try {
        await adicionarFuncionarioAction(fd);
        setMsg({ tipo: "ok", texto: "Funcionário cadastrado com sucesso." });
        formRef.current?.reset();
        router.refresh();
      } catch (err) {
        setMsg({
          tipo: "erro",
          texto: err instanceof Error ? err.message : "Erro ao cadastrar",
        });
      }
    });
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Adicionar funcionário</h3>
      <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="nome" className="text-xs font-medium text-muted">
            Nome
          </label>
          <input
            id="nome"
            name="nome"
            type="text"
            required
            placeholder="Ex: João Silva"
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="telefone" className="text-xs font-medium text-muted">
            Telefone (WhatsApp)
          </label>
          <input
            id="telefone"
            name="telefone"
            type="tel"
            required
            placeholder="55 11 99999-9999"
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <div className="flex flex-col justify-end">
          <button
            type="submit"
            disabled={pending}
            className="h-9 rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {pending ? "Adicionando..." : "+ Adicionar"}
          </button>
        </div>

        {msg && (
          <p className={`sm:col-span-3 text-xs ${msg.tipo === "ok" ? "text-success" : "text-danger"}`}>
            {msg.texto}
          </p>
        )}
      </form>
    </div>
  );
}
```

- [ ] **Commit:**

```bash
git add app/\(crm\)/configuracoes/funcionarios/funcionarios-form.tsx
git commit -m "feat: formulário de adição de funcionário autorizado"
```

---

## Task 4: Lista de funcionários

**Files:**
- Create: `app/(crm)/configuracoes/funcionarios/funcionarios-list.tsx`

- [ ] **Criar o componente:**

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FuncionarioItem } from "@/lib/supabase/queries/funcionarios";
import { toggleAtivoAction, removerFuncionarioAction } from "./actions";

interface FuncionariosListProps {
  funcionarios: FuncionarioItem[];
}

function formatarTelefone(tel: string) {
  if (tel.length === 13)
    return `${tel.slice(0, 2)} ${tel.slice(2, 4)} ${tel.slice(4, 9)}-${tel.slice(9)}`;
  if (tel.length === 11)
    return `${tel.slice(0, 2)} ${tel.slice(2, 7)}-${tel.slice(7)}`;
  return tel;
}

export function FuncionariosList({ funcionarios }: FuncionariosListProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleToggle(id: string, ativo: boolean) {
    startTransition(async () => {
      await toggleAtivoAction(id, ativo);
      router.refresh();
    });
  }

  function handleRemover(id: string, nome: string) {
    if (!confirm(`Remover "${nome}"? Esta ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      await removerFuncionarioAction(id);
      router.refresh();
    });
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">
          Funcionários autorizados{" "}
          <span className="font-normal text-muted">({funcionarios.length})</span>
        </h3>
      </div>

      {funcionarios.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted text-center">
          Nenhum funcionário cadastrado.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {funcionarios.map((f) => (
            <li key={f.id} className="flex items-center gap-4 px-5 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 font-semibold text-sm select-none">
                {f.nome.slice(0, 1).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{f.nome}</p>
                <p className="text-xs text-muted truncate">{formatarTelefone(f.telefone)}</p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={f.ativo}
                  disabled={pending}
                  onChange={(e) => handleToggle(f.id, e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-brand"
                />
                <span className="text-xs text-muted">{f.ativo ? "Ativo" : "Inativo"}</span>
              </label>

              <button
                type="button"
                disabled={pending}
                onClick={() => handleRemover(f.id, f.nome)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-danger hover:bg-danger-bg transition-colors disabled:opacity-50"
                title="Remover funcionário"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4h6v2" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Commit:**

```bash
git add app/\(crm\)/configuracoes/funcionarios/funcionarios-list.tsx
git commit -m "feat: lista de funcionários autorizados com toggle e remoção"
```

---

## Task 5: Server Component — página

**Files:**
- Create: `app/(crm)/configuracoes/funcionarios/page.tsx`

- [ ] **Criar o arquivo:**

```tsx
import { AccessRestricted } from "@/components/configuracoes/access-restricted";
import { listarFuncionarios } from "@/lib/supabase/queries/funcionarios";
import { isAdminUser } from "@/lib/auth/papel";
import { FuncionariosForm } from "./funcionarios-form";
import { FuncionariosList } from "./funcionarios-list";

export const metadata = { title: "Funcionários autorizados – Araujo Hub" };

export default async function FuncionariosConfigPage() {
  if (!(await isAdminUser())) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Funcionários autorizados</h2>
          <p className="text-sm text-muted mt-0.5">
            Quem pode solicitar alterações de preço via WhatsApp.
          </p>
        </div>
        <AccessRestricted descricao="Somente administradores gerenciam funcionários autorizados." />
      </div>
    );
  }

  const funcionarios = await listarFuncionarios();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Funcionários autorizados</h2>
        <p className="text-sm text-muted mt-0.5">
          Funcionários que podem solicitar alterações de preço via WhatsApp.
        </p>
      </div>
      <FuncionariosForm />
      <FuncionariosList funcionarios={funcionarios} />
    </div>
  );
}
```

- [ ] **Verificar TypeScript:**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Commit:**

```bash
git add app/\(crm\)/configuracoes/funcionarios/page.tsx
git commit -m "feat: página /configuracoes/funcionarios"
```

---

## Task 6: Adicionar item no menu de Configurações

**Files:**
- Modify: `components/configuracoes/settings-nav.tsx`

- [ ] **Adicionar entrada no `navAdmin` após `"Usuários e papéis"`:**

Localizar:
```ts
  { href: "/configuracoes/usuarios", label: "Usuários e papéis" },
```

Substituir por:
```ts
  { href: "/configuracoes/usuarios", label: "Usuários e papéis" },
  { href: "/configuracoes/funcionarios", label: "Funcionários autorizados" },
```

- [ ] **Verificar TypeScript:**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Testar manualmente:**

1. Acessar o hub como admin
2. Ir em Configurações → verificar que "Funcionários autorizados" aparece no menu
3. Adicionar um funcionário com nome e telefone — verificar mensagem de sucesso e aparecimento na lista
4. Tentar adicionar o mesmo telefone novamente — verificar erro "Este número já está cadastrado"
5. Tentar adicionar telefone com menos de 10 dígitos — verificar erro de validação
6. Clicar no toggle de um funcionário — verificar mudança de Ativo/Inativo
7. Remover um funcionário — verificar que some da lista após confirmação
8. Acessar a página como usuário com papel `atendimento` — verificar `<AccessRestricted>`

- [ ] **Commit:**

```bash
git add components/configuracoes/settings-nav.tsx
git commit -m "feat: adiciona Funcionários autorizados ao menu de configurações"
```
