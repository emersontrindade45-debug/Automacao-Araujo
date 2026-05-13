# Spec: Página de Preços — Catálogo Editável + Importação

**Data:** 2026-05-13
**Status:** Aprovado

---

## Contexto

A página `/precos` hoje exibe apenas a tabela de solicitações de atualização de preço (originadas do WhatsApp via N8n). Não há forma de editar preços ou estoques diretamente pelo Hub, nem de importar dados em lote.

A tabela `produtos` no Supabase não possui campo de estoque. A aprovação de uma solicitação já sincroniza `produtos.preco_atual` corretamente.

---

## Objetivo

Transformar `/precos` em ponto central de gestão de preços e estoque:

1. Adicionar `estoque_atual` à tabela `produtos`
2. Exibir o catálogo de produtos com edição inline de preço e estoque
3. Permitir importação em lote via planilha (CSV ou XLSX)
4. Preservar o comportamento atual das solicitações de aprovação

---

## Banco de Dados

### Nova migração: `estoque_atual`

```sql
ALTER TABLE produtos
  ADD COLUMN estoque_atual numeric(10,2) NOT NULL DEFAULT 0;
```

Arquivo: `supabase/migrations/YYYYMMDDHHMMSS_produtos_estoque.sql`

---

## Estrutura da Página

A página `/precos` passa a ter duas abas gerenciadas por estado client-side:

```
/precos
├── Header
│   ├── Título "Preços"
│   └── Badge de solicitações pendentes (existente)
└── Tabs: [Catálogo] [Solicitações]
    ├── Aba "Catálogo"
    │   ├── Botão "Importar planilha"
    │   └── CatalogoTab (tabela editável de produtos)
    └── Aba "Solicitações"
        └── PrecosTable (sem alteração)
```

A página é um Server Component que busca `produtos` e `atualizacoesPreco` em paralelo e passa como props para os componentes client.

---

## Aba Catálogo — Edição Inline

### Comportamento

- Tabela lista todos os produtos ativos (`ativo = true`) ordenados por nome
- Colunas: **Nome** | **Unidade** | **Preço Atual** | **Estoque Atual** | **Ativo** | **Ações**
- Cada linha tem botão "Editar"
- Ao clicar "Editar": `preco_atual` e `estoque_atual` viram `<input type="number">`, `ativo` vira toggle
- Apenas uma linha editável por vez — clicar "Editar" em outra linha descarta edição em curso
- Botões "Salvar" e "Cancelar" aparecem na linha em edição
- "Cancelar" restaura os valores originais sem chamar o servidor
- "Salvar" chama `editarProdutoAction(id, { preco_atual, estoque_atual, ativo })` via `useTransition`
- Server Action faz `UPDATE produtos SET preco_atual, estoque_atual, ativo WHERE id` e chama `revalidatePath("/precos")`

### Validação

- `preco_atual` e `estoque_atual`: numéricos, `>= 0`
- Inputs com `min="0"` e `step="0.01"`
- Salvar desabilitado se algum campo inválido

---

## Aba Catálogo — Importação via Planilha

### Formato esperado

| Coluna | Obrigatória | Tipo |
|---|---|---|
| `nome` | Sim | texto |
| `preco_atual` | Sim | número |
| `estoque_atual` | Sim | número |
| `unidade` | Não | texto |

Aceita `.csv` e `.xlsx`.

### Fluxo

1. Usuário clica "Importar planilha" → abre `ImportarModal`
2. Seleciona arquivo → parse client-side com `papaparse` (CSV) ou `xlsx` (XLSX)
3. Cada linha é validada:
   - `nome` obrigatório e não vazio
   - `preco_atual` e `estoque_atual` devem ser numéricos `>= 0`
   - `nome` deve dar match com um produto existente no banco (case-insensitive, via lista de produtos carregada na página)
4. Modal exibe prévia:
   - Linhas válidas: lista com nome, preço novo, estoque novo
   - Linhas com erro: destacadas com descrição do problema
   - Contagem: "X produtos serão atualizados, Y linhas com erro (ignoradas)"
5. Botão "Confirmar importação" (desabilitado se nenhuma linha válida)
6. Ao confirmar: `importarProdutosAction(linhasValidas)` — upsert em lote via `UPDATE` para cada produto com match
7. Modal fecha, tabela revalida

### Dependências de terceiros

- `papaparse` — parse de CSV (já popular, ~50kb)
- `xlsx` — parse de XLSX (SheetJS, ~800kb). Importar dinamicamente (`import()`) para não impactar o bundle inicial.

---

## Arquivos

| Arquivo | Operação | Descrição |
|---|---|---|
| `supabase/migrations/..._produtos_estoque.sql` | Criar | ADD COLUMN estoque_atual |
| `lib/types/index.ts` | Editar | + `estoque_atual: number` em `Produto` |
| `lib/supabase/queries/produtos.ts` | Editar | + `updateProduto`, `upsertProdutosEmLote` |
| `app/(crm)/precos/page.tsx` | Editar | Adiciona tabs, busca produtos |
| `app/(crm)/precos/actions.ts` | Editar | + `editarProdutoAction`, `importarProdutosAction` |
| `components/precos/catalogo-tab.tsx` | Criar | Tabela editável inline |
| `components/precos/importar-modal.tsx` | Criar | Modal de importação + prévia |
| `components/precos/precos-table.tsx` | Sem mudança | — |

---

## O que está fora do escopo

- Criação de novos produtos pelo Hub (apenas edição dos existentes)
- Desativação em massa de produtos
- Histórico de alterações de estoque
- Exportação de planilha
