# Preços — Catálogo Editável + Importação Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar `/precos` em ponto central de gestão — catálogo de produtos editável inline (preço + estoque), importação via CSV/XLSX e preservação do fluxo de solicitações existente.

**Architecture:** Server Component busca produtos e solicitações em paralelo e passa como props. Duas abas client-side (`Catálogo` e `Solicitações`). Edição inline salva direto em `produtos` via Server Action. Importação faz parse no cliente e envia lote validado via Server Action.

**Tech Stack:** Next.js 16 App Router, Supabase (server client), Server Actions, React `useTransition`, `papaparse` (CSV), `xlsx` (XLSX — import dinâmico), Tailwind CSS 4.

---

## Mapa de arquivos

| Arquivo | Operação |
|---|---|
| `supabase/migrations/20260513120000_produtos_estoque.sql` | Criar |
| `lib/types/index.ts` | Editar — `+ estoque_atual` em `Produto` |
| `lib/supabase/queries/produtos.ts` | Editar — `+ updateProduto`, `+ upsertProdutosEmLote` |
| `app/(crm)/precos/page.tsx` | Editar — busca produtos, layout com abas |
| `app/(crm)/precos/actions.ts` | Editar — `+ editarProdutoAction`, `+ importarProdutosAction` |
| `components/precos/catalogo-tab.tsx` | Criar — tabela editável inline |
| `components/precos/importar-modal.tsx` | Criar — modal de importação + prévia |

---

## Task 1: Migração — adicionar `estoque_atual` à tabela `produtos`

**Files:**
- Create: `supabase/migrations/20260513120000_produtos_estoque.sql`

- [ ] **Step 1: Criar o arquivo de migração**

```sql
-- supabase/migrations/20260513120000_produtos_estoque.sql
ALTER TABLE produtos
  ADD COLUMN estoque_atual numeric(10,2) NOT NULL DEFAULT 0;
```

- [ ] **Step 2: Aplicar a migração no Supabase**

Se usando Supabase CLI local:
```bash
npx supabase db push
```

Se aplicando direto no projeto remoto via MCP (sem CLI local), use a ferramenta `mcp__supabase__apply_migration` com o SQL acima e o `project_id` correto.

Verificar que a coluna aparece na tabela `produtos` no dashboard do Supabase.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260513120000_produtos_estoque.sql
git commit -m "feat(db): adiciona estoque_atual à tabela produtos"
```

---

## Task 2: Atualizar tipo `Produto` e queries de produtos

**Files:**
- Modify: `lib/types/index.ts`
- Modify: `lib/supabase/queries/produtos.ts`

- [ ] **Step 1: Adicionar `estoque_atual` ao tipo `Produto` em `lib/types/index.ts`**

Localizar a interface `Produto` (atualmente sem `estoque_atual`) e substituir por:

```typescript
export interface Produto {
  id: string;
  nome: string;
  preco_atual: number;
  estoque_atual: number;
  unidade: string;
  ativo: boolean;
  criado_em: string;
}
```

- [ ] **Step 2: Adicionar `updateProduto` e `upsertProdutosEmLote` em `lib/supabase/queries/produtos.ts`**

Adicionar ao final do arquivo (após `updatePrecoProduto`):

```typescript
export interface ProdutoUpdatePayload {
  preco_atual: number;
  estoque_atual: number;
  ativo: boolean;
}

export async function updateProduto(id: string, payload: ProdutoUpdatePayload) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("produtos")
    .update(payload)
    .eq("id", id);
  if (error) throw error;
}

export interface LinhaPlanilha {
  produto_id: string;
  preco_atual: number;
  estoque_atual: number;
}

export async function upsertProdutosEmLote(linhas: LinhaPlanilha[]) {
  const supabase = await createClient();
  // UPDATE sequencial — produtos não têm upsert por nome, match já foi feito no cliente
  await Promise.all(
    linhas.map(({ produto_id, preco_atual, estoque_atual }) =>
      supabase
        .from("produtos")
        .update({ preco_atual, estoque_atual })
        .eq("id", produto_id)
        .throwOnError()
    )
  );
}
```

- [ ] **Step 3: Verificar que `getProdutos` já retorna `estoque_atual`**

A query atual é `select("*")`, portanto retornará o novo campo automaticamente. Nenhuma mudança necessária.

- [ ] **Step 4: Verificar build**

```bash
npm run build
```

Esperado: sem erros de TypeScript relacionados a `estoque_atual`.

- [ ] **Step 5: Commit**

```bash
git add lib/types/index.ts lib/supabase/queries/produtos.ts
git commit -m "feat(types): adiciona estoque_atual ao tipo Produto e queries de atualização"
```

---

## Task 3: Server Actions — editar produto e importar em lote

**Files:**
- Modify: `app/(crm)/precos/actions.ts`

- [ ] **Step 1: Adicionar `editarProdutoAction` e `importarProdutosAction`**

Substituir o conteúdo completo de `app/(crm)/precos/actions.ts` por:

```typescript
"use server";

import { updateStatusPreco, aprovarPreco } from "@/lib/supabase/queries/precos";
import { updateProduto, upsertProdutosEmLote } from "@/lib/supabase/queries/produtos";
import type { LinhaPlanilha } from "@/lib/supabase/queries/produtos";
import { revalidatePath } from "next/cache";

export async function aprovarPrecoAction(precoId: string) {
  await aprovarPreco(precoId);
  revalidatePath("/precos");
}

export async function rejeitarPrecoAction(precoId: string) {
  await updateStatusPreco(precoId, "rejeitado");
  revalidatePath("/precos");
}

export async function editarProdutoAction(
  id: string,
  payload: { preco_atual: number; estoque_atual: number; ativo: boolean }
) {
  await updateProduto(id, payload);
  revalidatePath("/precos");
}

export async function importarProdutosAction(linhas: LinhaPlanilha[]) {
  await upsertProdutosEmLote(linhas);
  revalidatePath("/precos");
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Esperado: sem erros de TypeScript.

- [ ] **Step 3: Commit**

```bash
git add app/\(crm\)/precos/actions.ts
git commit -m "feat(actions): adiciona editarProduto e importarProdutos server actions"
```

---

## Task 4: Instalar dependências de parse de planilha

**Files:** `package.json`, `package-lock.json`

- [ ] **Step 1: Instalar `papaparse` e `xlsx` com seus tipos**

```bash
npm install papaparse xlsx
npm install --save-dev @types/papaparse
```

> `xlsx` (SheetJS) inclui seus próprios tipos. `@types/xlsx` não é necessário.

- [ ] **Step 2: Verificar instalação**

```bash
node -e "require('papaparse'); require('xlsx'); console.log('ok')"
```

Esperado: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: instala papaparse e xlsx para importação de planilhas"
```

---

## Task 5: Componente `CatalogoTab` — tabela editável inline

**Files:**
- Create: `components/precos/catalogo-tab.tsx`

- [ ] **Step 1: Criar `components/precos/catalogo-tab.tsx`**

```typescript
"use client";

import { useState, useTransition } from "react";
import type { Produto } from "@/lib/types";
import { editarProdutoAction } from "@/app/(crm)/precos/actions";
import { Button } from "@/components/ui/button";
import { ImportarModal } from "./importar-modal";

interface CatalogoTabProps {
  produtos: Produto[];
}

function formatMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface EditState {
  preco_atual: number;
  estoque_atual: number;
  ativo: boolean;
}

export function CatalogoTab({ produtos: inicial }: CatalogoTabProps) {
  const [produtos, setProdutos] = useState<Produto[]>(inicial);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<EditState | null>(null);
  const [importarAberto, setImportarAberto] = useState(false);
  const [pending, startTransition] = useTransition();

  function iniciarEdicao(produto: Produto) {
    setEditandoId(produto.id);
    setEditValues({
      preco_atual: produto.preco_atual,
      estoque_atual: produto.estoque_atual,
      ativo: produto.ativo,
    });
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setEditValues(null);
  }

  function salvarEdicao(id: string) {
    if (!editValues) return;
    const payload = {
      preco_atual: editValues.preco_atual,
      estoque_atual: editValues.estoque_atual,
      ativo: editValues.ativo,
    };
    setProdutos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...payload } : p))
    );
    setEditandoId(null);
    setEditValues(null);
    startTransition(() => editarProdutoAction(id, payload));
  }

  function onImportarConcluido(atualizados: { produto_id: string; preco_atual: number; estoque_atual: number }[]) {
    setProdutos((prev) =>
      prev.map((p) => {
        const atualizado = atualizados.find((a) => a.produto_id === p.id);
        return atualizado ? { ...p, preco_atual: atualizado.preco_atual, estoque_atual: atualizado.estoque_atual } : p;
      })
    );
  }

  const podeEditar = !pending;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={() => setImportarAberto(true)}>
          Importar planilha
        </Button>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-subtle">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Nome</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide hidden sm:table-cell">Unidade</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Preço Atual</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Estoque Atual</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide hidden md:table-cell">Ativo</th>
              <th className="px-4 py-3 w-36 text-right text-xs font-semibold text-muted uppercase tracking-wide">Ações</th>
            </tr>
          </thead>
          <tbody>
            {produtos.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-muted text-sm">
                  Nenhum produto encontrado.
                </td>
              </tr>
            )}
            {produtos.map((produto) => {
              const emEdicao = editandoId === produto.id;
              const valoresEdicao = emEdicao ? editValues! : null;
              const precoInvalido = valoresEdicao !== null && (isNaN(valoresEdicao.preco_atual) || valoresEdicao.preco_atual < 0);
              const estoqueInvalido = valoresEdicao !== null && (isNaN(valoresEdicao.estoque_atual) || valoresEdicao.estoque_atual < 0);

              return (
                <tr key={produto.id} className="border-b border-border last:border-0 hover:bg-surface-subtle transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{produto.nome}</td>
                  <td className="px-4 py-3 text-muted hidden sm:table-cell">{produto.unidade}</td>

                  <td className="px-4 py-3">
                    {emEdicao ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={valoresEdicao!.preco_atual}
                        onChange={(e) => setEditValues((v) => v ? { ...v, preco_atual: parseFloat(e.target.value) } : v)}
                        className="w-28 border border-border rounded-md px-2 py-1 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    ) : (
                      <span className="font-medium">{formatMoeda(produto.preco_atual)}</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {emEdicao ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={valoresEdicao!.estoque_atual}
                        onChange={(e) => setEditValues((v) => v ? { ...v, estoque_atual: parseFloat(e.target.value) } : v)}
                        className="w-24 border border-border rounded-md px-2 py-1 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    ) : (
                      <span>{produto.estoque_atual} {produto.unidade}</span>
                    )}
                  </td>

                  <td className="px-4 py-3 hidden md:table-cell">
                    {emEdicao ? (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={valoresEdicao!.ativo}
                        onClick={() => setEditValues((v) => v ? { ...v, ativo: !v.ativo } : v)}
                        className={[
                          "relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand",
                          valoresEdicao!.ativo ? "bg-brand" : "bg-border",
                        ].join(" ")}
                      >
                        <span className={[
                          "inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5",
                          valoresEdicao!.ativo ? "translate-x-4" : "translate-x-0.5",
                        ].join(" ")} />
                      </button>
                    ) : (
                      <span className={produto.ativo ? "text-success text-xs font-medium" : "text-muted text-xs"}>
                        {produto.ativo ? "Ativo" : "Inativo"}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {emEdicao ? (
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={cancelarEdicao}>
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={precoInvalido || estoqueInvalido}
                          onClick={() => salvarEdicao(produto.id)}
                        >
                          Salvar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!podeEditar}
                        onClick={() => iniciarEdicao(produto)}
                      >
                        Editar
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ImportarModal
        aberto={importarAberto}
        onFechar={() => setImportarAberto(false)}
        produtos={produtos}
        onConcluido={onImportarConcluido}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Esperado: sem erros de TypeScript.

- [ ] **Step 3: Commit**

```bash
git add components/precos/catalogo-tab.tsx
git commit -m "feat(ui): adiciona CatalogoTab com edição inline de preço e estoque"
```

---

## Task 6: Componente `ImportarModal` — parse e prévia da planilha

**Files:**
- Create: `components/precos/importar-modal.tsx`

- [ ] **Step 1: Criar `components/precos/importar-modal.tsx`**

```typescript
"use client";

import { useState, useTransition, useRef } from "react";
import type { Produto } from "@/lib/types";
import type { LinhaPlanilha } from "@/lib/supabase/queries/produtos";
import { importarProdutosAction } from "@/app/(crm)/precos/actions";
import { Button } from "@/components/ui/button";

interface ImportarModalProps {
  aberto: boolean;
  onFechar: () => void;
  produtos: Produto[];
  onConcluido: (atualizados: LinhaPlanilha[]) => void;
}

interface LinhaPrevia {
  nome: string;
  produto_id: string | null;
  preco_atual: number | null;
  estoque_atual: number | null;
  erro: string | null;
}

function parseNumero(v: unknown): number | null {
  const n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) || n < 0 ? null : n;
}

async function parseArquivo(file: File, produtosRef: Produto[]): Promise<LinhaPrevia[]> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  let rows: Record<string, unknown>[] = [];

  if (ext === "csv") {
    const Papa = (await import("papaparse")).default;
    const text = await file.text();
    const result = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
    rows = result.data;
  } else if (ext === "xlsx" || ext === "xls") {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
  } else {
    return [];
  }

  return rows.map((row) => {
    const nome = String(row["nome"] ?? row["Nome"] ?? "").trim();
    if (!nome) return { nome: "(vazio)", produto_id: null, preco_atual: null, estoque_atual: null, erro: "Nome obrigatório" };

    const match = produtosRef.find((p) => p.nome.toLowerCase() === nome.toLowerCase());
    if (!match) return { nome, produto_id: null, preco_atual: null, estoque_atual: null, erro: `Produto "${nome}" não encontrado no catálogo` };

    const preco_atual = parseNumero(row["preco_atual"] ?? row["Preço Atual"] ?? row["preco"] ?? row["Preco"]);
    const estoque_atual = parseNumero(row["estoque_atual"] ?? row["Estoque Atual"] ?? row["estoque"] ?? row["Estoque"]);

    if (preco_atual === null) return { nome, produto_id: match.id, preco_atual: null, estoque_atual: null, erro: "preco_atual inválido (deve ser número >= 0)" };
    if (estoque_atual === null) return { nome, produto_id: match.id, preco_atual, estoque_atual: null, erro: "estoque_atual inválido (deve ser número >= 0)" };

    return { nome, produto_id: match.id, preco_atual, estoque_atual, erro: null };
  });
}

function formatMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ImportarModal({ aberto, onFechar, produtos, onConcluido }: ImportarModalProps) {
  const [previa, setPrevia] = useState<LinhaPrevia[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  if (!aberto) return null;

  async function onArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCarregando(true);
    const linhas = await parseArquivo(file, produtos);
    setPrevia(linhas);
    setCarregando(false);
  }

  function fechar() {
    setPrevia(null);
    if (inputRef.current) inputRef.current.value = "";
    onFechar();
  }

  const validas = previa?.filter((l) => l.erro === null && l.produto_id !== null) ?? [];
  const comErro = previa?.filter((l) => l.erro !== null) ?? [];

  function confirmar() {
    const linhas: LinhaPlanilha[] = validas.map((l) => ({
      produto_id: l.produto_id!,
      preco_atual: l.preco_atual!,
      estoque_atual: l.estoque_atual!,
    }));
    startTransition(async () => {
      await importarProdutosAction(linhas);
      onConcluido(linhas);
      fechar();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Importar planilha</h2>
          <button onClick={fechar} className="text-muted hover:text-foreground transition-colors">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {!previa && (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                Selecione um arquivo <strong>.csv</strong> ou <strong>.xlsx</strong> com as colunas:
                <code className="ml-1 px-1.5 py-0.5 bg-surface-subtle rounded text-xs">nome</code>,{" "}
                <code className="px-1.5 py-0.5 bg-surface-subtle rounded text-xs">preco_atual</code>,{" "}
                <code className="px-1.5 py-0.5 bg-surface-subtle rounded text-xs">estoque_atual</code>.
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={onArquivoSelecionado}
                className="block w-full text-sm text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-border file:text-xs file:font-medium file:bg-surface-subtle file:text-foreground hover:file:bg-surface cursor-pointer"
              />
              {carregando && <p className="text-sm text-muted">Processando arquivo...</p>}
            </div>
          )}

          {previa && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">
                {validas.length} produto{validas.length !== 1 ? "s" : ""} serão atualizados
                {comErro.length > 0 && (
                  <span className="text-warning ml-1">· {comErro.length} linha{comErro.length !== 1 ? "s" : ""} com erro (ignoradas)</span>
                )}
              </p>

              {validas.length > 0 && (
                <div className="bg-surface border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-surface-subtle">
                        <th className="text-left px-3 py-2 text-muted font-semibold uppercase tracking-wide">Produto</th>
                        <th className="text-left px-3 py-2 text-muted font-semibold uppercase tracking-wide">Novo Preço</th>
                        <th className="text-left px-3 py-2 text-muted font-semibold uppercase tracking-wide">Novo Estoque</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validas.map((l, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 font-medium text-foreground">{l.nome}</td>
                          <td className="px-3 py-2 text-foreground">{formatMoeda(l.preco_atual!)}</td>
                          <td className="px-3 py-2 text-foreground">{l.estoque_atual}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {comErro.length > 0 && (
                <div className="bg-danger-bg border border-[var(--danger-border,theme(colors.red.200))] rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-danger uppercase tracking-wide">Linhas com erro</p>
                  {comErro.map((l, i) => (
                    <p key={i} className="text-xs text-danger">
                      <span className="font-medium">{l.nome}</span>: {l.erro}
                    </p>
                  ))}
                </div>
              )}

              <button
                onClick={() => { setPrevia(null); if (inputRef.current) inputRef.current.value = ""; }}
                className="text-xs text-brand hover:underline"
              >
                Selecionar outro arquivo
              </button>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={fechar}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!previa || validas.length === 0 || pending}
            onClick={confirmar}
          >
            {pending ? "Importando..." : `Confirmar importação${validas.length > 0 ? ` (${validas.length})` : ""}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Esperado: sem erros de TypeScript.

- [ ] **Step 3: Commit**

```bash
git add components/precos/importar-modal.tsx
git commit -m "feat(ui): adiciona ImportarModal com parse CSV/XLSX e prévia de importação"
```

---

## Task 7: Atualizar página `/precos` com abas

**Files:**
- Modify: `app/(crm)/precos/page.tsx`

- [ ] **Step 1: Substituir conteúdo de `app/(crm)/precos/page.tsx`**

```typescript
import { PrecosPageClient } from "@/components/precos/precos-page-client";
import { getAtualizacoesPreco, countPrecosPendentes } from "@/lib/supabase/queries/precos";
import { getProdutos } from "@/lib/supabase/queries/produtos";

export const metadata = { title: "Preços – Araujo Hub" };

export default async function PrecosPage() {
  const [atualizacoes, pendentes, produtos] = await Promise.all([
    getAtualizacoesPreco(),
    countPrecosPendentes(),
    getProdutos(),
  ]);

  return (
    <PrecosPageClient
      atualizacoes={atualizacoes}
      pendentes={pendentes}
      produtos={produtos}
    />
  );
}
```

- [ ] **Step 2: Criar `components/precos/precos-page-client.tsx`**

Este componente client gerencia o estado da aba ativa e compõe o layout:

```typescript
"use client";

import { useState } from "react";
import type { Produto } from "@/lib/types";
import type { AtualizacaoPreco } from "@/lib/supabase/queries/precos";
import { PrecosTable } from "./precos-table";
import { CatalogoTab } from "./catalogo-tab";

interface PrecosPageClientProps {
  atualizacoes: AtualizacaoPreco[];
  pendentes: number;
  produtos: Produto[];
}

type Aba = "catalogo" | "solicitacoes";

export function PrecosPageClient({ atualizacoes, pendentes, produtos }: PrecosPageClientProps) {
  const [aba, setAba] = useState<Aba>("catalogo");

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Preços</h1>
          <p className="text-sm text-muted mt-0.5">Gerencie catálogo e aprove atualizações de preço</p>
        </div>
        {pendentes > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-warning-bg text-warning border border-[var(--warning-border)] px-3 py-1.5 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-warning inline-block" />
            {pendentes} pendente{pendentes > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="flex gap-1 border-b border-border">
        {(["catalogo", "solicitacoes"] as Aba[]).map((t) => (
          <button
            key={t}
            onClick={() => setAba(t)}
            className={[
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              aba === t
                ? "border-brand text-brand"
                : "border-transparent text-muted hover:text-foreground",
            ].join(" ")}
          >
            {t === "catalogo" ? "Catálogo" : "Solicitações"}
            {t === "solicitacoes" && pendentes > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-warning text-white text-[10px] font-bold">
                {pendentes}
              </span>
            )}
          </button>
        ))}
      </div>

      {aba === "catalogo" && <CatalogoTab produtos={produtos} />}
      {aba === "solicitacoes" && <PrecosTable atualizacoes={atualizacoes} />}
    </div>
  );
}
```

- [ ] **Step 3: Verificar build**

```bash
npm run build
```

Esperado: build limpo sem erros.

- [ ] **Step 4: Commit**

```bash
git add app/\(crm\)/precos/page.tsx components/precos/precos-page-client.tsx
git commit -m "feat(precos): adiciona abas Catálogo e Solicitações na página de preços"
```

---

## Task 8: Verificação final end-to-end

- [ ] **Step 1: Iniciar o servidor de desenvolvimento**

```bash
npm run dev
```

- [ ] **Step 2: Verificar aba Catálogo**

Acessar `http://localhost:3000/precos`:
- Aba "Catálogo" deve aparecer selecionada por padrão
- Tabela deve listar produtos com colunas Nome, Unidade, Preço Atual, Estoque Atual, Ativo, Ações
- Botão "Editar" em cada linha
- Ao clicar "Editar": campos Preço Atual e Estoque Atual viram inputs numéricos, Ativo vira toggle
- "Cancelar" restaura valores sem salvar
- "Salvar" persiste no Supabase (verificar no dashboard)

- [ ] **Step 3: Verificar importação CSV**

Criar arquivo `teste.csv`:
```
nome,preco_atual,estoque_atual
Arroz 5kg,24.90,50
Feijão 1kg,8.50,30
ProdutoInexistente,10.00,5
```

Clicar "Importar planilha", selecionar o arquivo:
- 2 linhas válidas devem aparecer na prévia
- 1 linha com erro ("ProdutoInexistente não encontrado no catálogo")
- Confirmar importação → preços e estoques atualizados na tabela

- [ ] **Step 4: Verificar aba Solicitações**

Clicar na aba "Solicitações" — comportamento idêntico ao anterior (aprovar/rejeitar).

- [ ] **Step 5: Verificar sincronização Supabase**

Editar um produto pelo Hub → conferir no Supabase dashboard que `preco_atual` e `estoque_atual` foram atualizados.

- [ ] **Step 6: Commit final**

```bash
git add .
git commit -m "feat(M8): integração Supabase na página de Preços — catálogo editável, estoque e importação de planilha"
```
