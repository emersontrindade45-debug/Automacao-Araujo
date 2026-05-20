# Design: Funcionários Autorizados — Configurações

**Data:** 2026-05-19
**Rota:** `/configuracoes/funcionarios`
**Acesso:** somente admin

---

## Contexto

O Fluxo 5 (n8n) notifica via WhatsApp o funcionário que solicitou uma alteração de preço quando o admin aprova. A solicitação chega pelo endpoint `/api/webhooks/whatsapp/price-update`, que já verifica se o número do remetente está na tabela `funcionarios_autorizados`. O dono precisa gerenciar essa lista diretamente no hub, sem acessar o Supabase.

---

## Tabela (já criada)

```sql
CREATE TABLE funcionarios_autorizados (
  id        uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  nome      text    NOT NULL,
  telefone  text    NOT NULL UNIQUE,  -- somente dígitos, com DDI
  ativo     boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);
```

---

## Arquitetura

### Arquivos novos

| Arquivo | Tipo | Responsabilidade |
|---------|------|-----------------|
| `app/(crm)/configuracoes/funcionarios/page.tsx` | Server Component | Busca lista, verifica papel admin, compõe a página |
| `app/(crm)/configuracoes/funcionarios/actions.ts` | Server Actions | `adicionarFuncionarioAction`, `toggleAtivoAction`, `removerFuncionarioAction` |
| `app/(crm)/configuracoes/funcionarios/funcionarios-form.tsx` | Client Component | Formulário de adição (nome + telefone) |
| `app/(crm)/configuracoes/funcionarios/funcionarios-list.tsx` | Client Component | Lista com toggle ativo/inativo e botão remover |
| `lib/supabase/queries/funcionarios.ts` | Query helpers | `listarFuncionarios`, `adicionarFuncionario`, `toggleAtivo`, `removerFuncionario` |

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `components/configuracoes/settings-nav.tsx` | Adicionar item `{ href: "/configuracoes/funcionarios", label: "Funcionários autorizados" }` no `navAdmin` |

---

## Componentes

### `page.tsx`
- Server Component assíncrono
- Verifica `app_metadata.papel === "admin"` via `createClient()` — retorna `<AccessRestricted>` se não for admin
- Busca lista com `listarFuncionarios()`
- Renderiza `<FuncionariosForm />` e `<FuncionariosList funcionarios={...} />`

### `funcionarios-form.tsx`
- Client Component com `useTransition`
- Campos: **Nome** (text) e **Telefone** (text, placeholder `55 11 99999-9999`)
- Submit chama `adicionarFuncionarioAction` e limpa o form em caso de sucesso
- Exibe erro inline abaixo do campo Telefone (duplicata, formato inválido)

### `funcionarios-list.tsx`
- Client Component com `useTransition` e `useRouter` para refresh
- Para cada funcionário:
  - Avatar com inicial do nome
  - Nome + telefone formatado
  - Toggle (checkbox ou switch) para `ativo` — chama `toggleAtivoAction`
  - Botão de lixeira para remover — chama `removerFuncionarioAction` com `confirm()`
- Estado vazio: "Nenhum funcionário cadastrado."

### `actions.ts`

```ts
adicionarFuncionarioAction(formData: FormData)
  → strip não-dígitos do telefone
  → valida length >= 10, senão retorna erro
  → insere na tabela
  → revalidatePath("/configuracoes/funcionarios")

toggleAtivoAction(id: string, ativo: boolean)
  → atualiza campo ativo
  → revalidatePath("/configuracoes/funcionarios")

removerFuncionarioAction(id: string)
  → deleta registro
  → revalidatePath("/configuracoes/funcionarios")
```

Todas as actions verificam papel admin com uma função `assertAdmin()` local que usa `isAdminUser()` de `lib/auth/papel.ts` (já existente). Operações de escrita usam `createAdminClient()`.

---

## Validações

| Regra | Mensagem |
|-------|----------|
| Telefone com menos de 10 dígitos | "Telefone inválido — use DDI + DDD + número (ex: 5511999999999)" |
| Telefone duplicado (unique constraint) | "Este número já está cadastrado" |
| Nome vazio | "Informe o nome do funcionário" |

---

## Navegação

`settings-nav.tsx` — inserir após `"Usuários e papéis"`:

```ts
{ href: "/configuracoes/funcionarios", label: "Funcionários autorizados" },
```

O middleware já protege `/configuracoes/*` para admin — nenhuma alteração necessária no middleware.

---

## Fora de escopo

- Importação em lote de telefones
- Campo de cargo/função
- Histórico de alterações
