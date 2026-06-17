# Ações em Massa em Produtos (Planilha + Hub) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir aplicar upsert/ativar/desativar em massa sobre a tabela `produtos`, tanto via planilha (script Python) quanto via seleção múltipla na UI do Catálogo (Hub).

**Architecture:** O script Python (`dados/aplicar_acoes_produtos.py`) lê uma planilha com coluna `acao` e despacha para upsert (REST POST com `on_conflict=nome`) ou ativar/desativar (REST PATCH com filtro `nome=in.(...)`), em lotes pequenos com pausa — mesmo padrão de `dados/atualizar_precos.py`. Na UI, uma nova função `ativarDesativarEmLote` em `lib/supabase/queries/produtos.ts` é exposta via uma nova server action, chamada por uma barra de seleção múltipla adicionada a `components/precos/catalogo-tab.tsx`.

**Tech Stack:** Python 3 (openpyxl, urllib — sem dependências novas), Next.js Server Actions, Supabase REST (PostgREST), React (client component existente).

## Global Constraints

- Ações aceitas na coluna `acao` da planilha: `upsert` (ou célula vazia), `ativar`, `desativar` — case-insensitive, espaços nas pontas ignorados.
- `ativar`/`desativar` tocam **somente** o campo `ativo`; demais colunas da linha são ignoradas mesmo se preenchidas.
- `ativar`/`desativar` para um `nome` que não existe no banco: a linha é pulada e reportada, não interrompe o restante.
- Linha com `acao` fora dos 3 valores aceitos: erro reportado, linha pulada, não interrompe o restante.
- Envio ao Supabase em lotes de 50 com pausa de 8s entre lotes (mesmo valor de `dados/atualizar_precos.py`), pois cada update dispara o trigger `produtos_embedding_trigger` (1 chamada OpenAI por linha afetada).
- Não existe delete real nesta feature — "excluir" é sempre soft-delete (`ativo=false`).
- UI: nenhuma edição em massa de categoria/preço nesta fase — somente ativar/desativar.

---

## Task 1: Script de ações em massa via planilha

**Files:**
- Create: `dados/aplicar_acoes_produtos.py`

**Interfaces:**
- Consumes: `../.env.local` (mesmas chaves `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` já usadas em `dados/atualizar_precos.py` e `dados/importar_produtos.py`).
- Produces: script standalone executado via `python aplicar_acoes_produtos.py [--dry-run] [--limite N] <arquivo.xlsx>`. Não é importado por nenhum outro módulo.

Este script não tem testes automatizados (mesmo padrão dos demais scripts em `dados/` — são ferramentas operacionais rodadas manualmente, não código de produto). A validação é feita via `--dry-run` contra uma planilha de teste pequena, como já é prática no repositório.

- [ ] **Step 1: Criar a planilha de teste**

Crie manualmente (ou via Python) um arquivo `dados/teste_acoes.xlsx` com a aba `Produtos` e estas colunas/linhas:

| nome | acao | unidade | preco_atual | categoria | nicho | validade |
|---|---|---|---|---|---|---|
| Produto Teste Upsert A | upsert | UN | 9.90 | mercearia | | |
| Produto Teste Sem Acao | | UN | 5.00 | limpeza | | |
| Veja Multiuso Lavanda | desativar | | | | | |
| Produto Inexistente XYZ | ativar | | | | | |
| Produto Teste Acao Invalida | apagar | UN | 1.00 | | | |

Use este script auxiliar (rode uma vez, não faz parte da entrega):

```python
import openpyxl
wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Produtos"
ws.append(["nome", "acao", "unidade", "preco_atual", "categoria", "nicho", "validade"])
ws.append(["Produto Teste Upsert A", "upsert", "UN", 9.90, "mercearia", None, None])
ws.append(["Produto Teste Sem Acao", None, "UN", 5.00, "limpeza", None, None])
ws.append(["Veja Multiuso Lavanda", "desativar", None, None, None, None, None])
ws.append(["Produto Inexistente XYZ", "ativar", None, None, None, None, None])
ws.append(["Produto Teste Acao Invalida", "apagar", "UN", 1.00, None, None, None])
wb.save("dados/teste_acoes.xlsx")
```

Run: `cd "dados" && python -c "<script acima com path dados/teste_acoes.xlsx -> teste_acoes.xlsx>"`
(ajuste o path de save para `teste_acoes.xlsx` já que o cwd é `dados/`)

Expected: arquivo `dados/teste_acoes.xlsx` criado.

- [ ] **Step 2: Escrever o script `dados/aplicar_acoes_produtos.py`**

```python
# -*- coding: utf-8 -*-
"""
Aplica acoes em massa na tabela `produtos` a partir de uma planilha com
coluna `acao` (upsert, ativar, desativar). Reaproveita o padrao de lotes
pequenos com pausa de dados/atualizar_precos.py.

Acoes aceitas (coluna `acao`, case-insensitive, vazio = upsert):
  upsert     -> cria por nome (se nao existe) ou atualiza todos os campos
                preenchidos na linha (unidade, preco_atual, categoria, nicho,
                validade). Sempre forca ativo=true.
  ativar     -> so altera ativo=true para o nome. Demais colunas ignoradas.
  desativar  -> so altera ativo=false para o nome. Demais colunas ignoradas.

ativar/desativar para um nome que nao existe no banco: linha pulada e
reportada no log final, nao interrompe o processamento.

Uso:
  python aplicar_acoes_produtos.py <arquivo.xlsx>
  python aplicar_acoes_produtos.py <arquivo.xlsx> --dry-run
  python aplicar_acoes_produtos.py <arquivo.xlsx> --limite 100
"""
import json, sys, time
import openpyxl
import urllib.request, urllib.error

ENV = "../.env.local"
BATCH = 50
PAUSA_SEGUNDOS = 8
ACOES_VALIDAS = {"upsert", "ativar", "desativar", ""}


def carregar_env():
    url = key = None
    for line in open(ENV, encoding="utf-8", errors="replace"):
        line = line.strip()
        if line.startswith("NEXT_PUBLIC_SUPABASE_URL"):
            url = line.split("=", 1)[1].strip().strip('"').strip("'")
        if line.startswith("SUPABASE_SERVICE_ROLE_KEY"):
            key = line.split("=", 1)[1].strip().strip('"').strip("'")
    if not url or not key:
        raise SystemExit("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao encontrados em " + ENV)
    return url.rstrip("/"), key


def supabase_request(url, key, method, endpoint_suffix, body, dry_run):
    if dry_run:
        return
    req = urllib.request.Request(
        f"{url}{endpoint_suffix}",
        data=json.dumps(body).encode("utf-8") if body is not None else None,
        method=method,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal" if method == "POST" else "return=minimal",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return
    except urllib.error.HTTPError as e:
        body_err = e.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Erro HTTP {e.code} ({method} {endpoint_suffix}): {body_err}")


def ler_planilha(caminho):
    wb = openpyxl.load_workbook(caminho, read_only=True, data_only=True)
    ws = wb["Produtos"]
    headers = [c.value for c in next(ws.iter_rows(min_row=1, max_row=1))]
    col = {h: i for i, h in enumerate(headers)}

    linhas_upsert = []
    nomes_ativar = []
    nomes_desativar = []
    erros = []

    for row in ws.iter_rows(min_row=2, values_only=True):
        nome = row[col["nome"]] if "nome" in col else None
        if not nome or not str(nome).strip():
            erros.append(("(vazio)", "nome_vazio"))
            continue
        nome = str(nome).strip()

        acao_raw = row[col["acao"]] if "acao" in col and row[col["acao"]] else ""
        acao = str(acao_raw).strip().lower()
        if acao not in ACOES_VALIDAS:
            erros.append((nome, f"acao_invalida:{acao_raw}"))
            continue

        if acao == "ativar":
            nomes_ativar.append(nome)
        elif acao == "desativar":
            nomes_desativar.append(nome)
        else:  # upsert ou vazio
            preco = row[col["preco_atual"]] if "preco_atual" in col else None
            unidade = row[col["unidade"]] if "unidade" in col and row[col["unidade"]] else "UN"
            categoria = row[col["categoria"]] if "categoria" in col and row[col["categoria"]] else None
            nicho = row[col["nicho"]] if "nicho" in col and row[col["nicho"]] else None
            validade = row[col["validade"]] if "validade" in col and row[col["validade"]] else None
            if preco is None:
                erros.append((nome, "upsert_sem_preco"))
                continue
            linhas_upsert.append({
                "nome": nome,
                "preco_atual": round(float(preco), 2),
                "unidade": str(unidade).strip(),
                "categoria": str(categoria).strip().lower() if categoria else None,
                "nicho": str(nicho).strip().lower() if nicho else None,
                "validade": str(validade).strip() if validade else None,
                "ativo": True,
            })

    wb.close()
    return linhas_upsert, nomes_ativar, nomes_desativar, erros


def verificar_existentes(url, key, nomes, dry_run):
    """Retorna o subconjunto de `nomes` que de fato existe na tabela produtos."""
    if dry_run or not nomes:
        return set(nomes)
    existentes = set()
    for i in range(0, len(nomes), BATCH):
        lote = nomes[i:i + BATCH]
        filtro = ",".join(f'"{n}"' for n in lote)
        req = urllib.request.Request(
            f"{url}/rest/v1/produtos?nome=in.({filtro})&select=nome",
            method="GET",
            headers={"apikey": key, "Authorization": f"Bearer {key}"},
        )
        with urllib.request.urlopen(req, timeout=60) as r:
            data = json.loads(r.read().decode("utf-8"))
            existentes.update(item["nome"] for item in data)
    return existentes


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        raise SystemExit("Uso: python aplicar_acoes_produtos.py <arquivo.xlsx> [--dry-run] [--limite N]")
    caminho = args[0]

    dry_run = "--dry-run" in sys.argv
    limite = None
    if "--limite" in sys.argv:
        limite = int(sys.argv[sys.argv.index("--limite") + 1])

    if dry_run:
        print("[DRY-RUN] Nenhuma alteracao sera feita no banco.")

    url, key = carregar_env()

    linhas_upsert, nomes_ativar, nomes_desativar, erros = ler_planilha(caminho)

    if limite:
        linhas_upsert = linhas_upsert[:limite]
        nomes_ativar = nomes_ativar[:limite]
        nomes_desativar = nomes_desativar[:limite]

    print(f"upsert: {len(linhas_upsert)} | ativar: {len(nomes_ativar)} | desativar: {len(nomes_desativar)} | erros de leitura: {len(erros)}")

    # valida existencia antes de ativar/desativar
    existentes_ativar = verificar_existentes(url, key, nomes_ativar, dry_run)
    existentes_desativar = verificar_existentes(url, key, nomes_desativar, dry_run)
    nao_encontrados = (set(nomes_ativar) - existentes_ativar) | (set(nomes_desativar) - existentes_desativar)
    for nome in nao_encontrados:
        erros.append((nome, "nome_nao_encontrado_no_banco"))

    nomes_ativar = [n for n in nomes_ativar if n in existentes_ativar]
    nomes_desativar = [n for n in nomes_desativar if n in existentes_desativar]

    total_aplicado = 0

    # upsert em lotes
    for i in range(0, len(linhas_upsert), BATCH):
        lote = linhas_upsert[i:i + BATCH]
        supabase_request(url, key, "POST", "/rest/v1/produtos?on_conflict=nome", lote, dry_run)
        total_aplicado += len(lote)
        print(f"  upsert {min(i+BATCH, len(linhas_upsert))}/{len(linhas_upsert)}", flush=True)
        if i + BATCH < len(linhas_upsert) and not dry_run:
            time.sleep(PAUSA_SEGUNDOS)

    # ativar em lotes (PATCH com filtro nome=in.(...))
    for i in range(0, len(nomes_ativar), BATCH):
        lote = nomes_ativar[i:i + BATCH]
        filtro = ",".join(f'"{n}"' for n in lote)
        supabase_request(url, key, "PATCH", f"/rest/v1/produtos?nome=in.({filtro})", {"ativo": True}, dry_run)
        total_aplicado += len(lote)
        print(f"  ativar {min(i+BATCH, len(nomes_ativar))}/{len(nomes_ativar)}", flush=True)
        if i + BATCH < len(nomes_ativar) and not dry_run:
            time.sleep(PAUSA_SEGUNDOS)

    # desativar em lotes
    for i in range(0, len(nomes_desativar), BATCH):
        lote = nomes_desativar[i:i + BATCH]
        filtro = ",".join(f'"{n}"' for n in lote)
        supabase_request(url, key, "PATCH", f"/rest/v1/produtos?nome=in.({filtro})", {"ativo": False}, dry_run)
        total_aplicado += len(lote)
        print(f"  desativar {min(i+BATCH, len(nomes_desativar))}/{len(nomes_desativar)}", flush=True)
        if i + BATCH < len(nomes_desativar) and not dry_run:
            time.sleep(PAUSA_SEGUNDOS)

    print(f"\n{'[DRY-RUN] ' if dry_run else ''}Concluido: {total_aplicado} acoes aplicadas.")
    if erros:
        print(f"\n{len(erros)} linha(s) ignorada(s):")
        for nome, motivo in erros:
            print(f"  {nome}: {motivo}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Rodar dry-run contra a planilha de teste**

Run: `cd dados && python aplicar_acoes_produtos.py teste_acoes.xlsx --dry-run`

Expected output (contagens — a ordem de "erros" pode variar):
```
[DRY-RUN] Nenhuma alteracao sera feita no banco.
upsert: 2 | ativar: 1 | desativar: 1 | erros de leitura: 1
...
[DRY-RUN] Concluido: 4 acoes aplicadas.

2 linha(s) ignorada(s):
  Produto Teste Acao Invalida: acao_invalida:apagar
  Produto Inexistente XYZ: nome_nao_encontrado_no_banco
```

Confirme: "Produto Teste Upsert A" e "Produto Teste Sem Acao" contam como upsert (2), "Veja Multiuso Lavanda" como desativar (1), "Produto Inexistente XYZ" tentaria ativar mas será listado em "nao encontrados" (a contagem de erros sobe para 2 após a checagem de existência, mesmo achando 1 erro de leitura inicialmente).

- [ ] **Step 4: Rodar de verdade contra a planilha de teste (sem dry-run)**

Pré-requisito: "Veja Multiuso Lavanda" deve existir e estar ativo no banco antes deste teste (já existe, foi importado/ativado em sessão anterior).

Run: `cd dados && python aplicar_acoes_produtos.py teste_acoes.xlsx`

Expected: sem erros HTTP; saída final `Concluido: 4 acoes aplicadas.` e a listagem de 2 linhas ignoradas (acao invalida + nome inexistente).

- [ ] **Step 5: Verificar no banco via Supabase MCP**

Use a tool `mcp__supabase__execute_sql` no projeto `zziapgnenvugyvrgrhrs`:

```sql
select nome, preco_atual, ativo from produtos
where nome in ('Produto Teste Upsert A', 'Produto Teste Sem Acao', 'Veja Multiuso Lavanda');
```

Expected:
- "Produto Teste Upsert A": preco_atual=9.90, ativo=true (criado pelo script)
- "Produto Teste Sem Acao": preco_atual=5.00, ativo=true (criado via upsert implícito, acao vazia)
- "Veja Multiuso Lavanda": ativo=false (desativado, preco_atual inalterado)

- [ ] **Step 6: Limpar os produtos de teste criados**

```sql
delete from produtos where nome in ('Produto Teste Upsert A', 'Produto Teste Sem Acao');
update produtos set ativo = true where nome = 'Veja Multiuso Lavanda';
```

Rode via `mcp__supabase__execute_sql` no mesmo projeto. Isso reverte o estado de teste, deixando "Veja Multiuso Lavanda" como estava antes (ativo).

- [ ] **Step 7: Remover a planilha de teste e commitar o script**

```bash
rm dados/teste_acoes.xlsx
git add dados/aplicar_acoes_produtos.py
git commit -m "feat(produtos): script de acoes em massa via planilha (upsert/ativar/desativar)"
```

---

## Task 2: Função de ativar/desativar em lote (backend)

**Files:**
- Modify: `lib/supabase/queries/produtos.ts`
- Modify: `app/(crm)/precos/actions.ts`

**Interfaces:**
- Consumes: `createAdminClient` de `@/lib/supabase/admin` (já importado em ambos os arquivos).
- Produces: `ativarDesativarEmLote(ids: string[], ativo: boolean): Promise<void>` em `lib/supabase/queries/produtos.ts`; `ativarDesativarProdutosAction(ids: string[], ativo: boolean): Promise<void>` em `app/(crm)/precos/actions.ts` — esta é a função que a UI (Task 3) chama.

- [ ] **Step 1: Adicionar `ativarDesativarEmLote` em `lib/supabase/queries/produtos.ts`**

Adicione ao final do arquivo (após `upsertProdutosEmLote`, que termina na linha 153 após a Task anterior desta sessão remover a lógica de delete):

```typescript
export async function ativarDesativarEmLote(ids: string[], ativo: boolean) {
  if (ids.length === 0) return;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("produtos")
    .update({ ativo })
    .in("id", ids);

  if (error) throw error;
}
```

- [ ] **Step 2: Adicionar a server action em `app/(crm)/precos/actions.ts`**

Adicione ao final do arquivo:

```typescript
export async function ativarDesativarProdutosAction(ids: string[], ativo: boolean) {
  await ativarDesativarEmLote(ids, ativo);
  revalidatePath("/precos");
}
```

E atualize o import no topo do arquivo (linha 4) para incluir a nova função:

```typescript
import { updateProduto, upsertProdutosEmLote, ativarDesativarEmLote } from "@/lib/supabase/queries/produtos";
```

- [ ] **Step 3: Verificar compilação**

Run: `npx tsc --noEmit`

Expected: sem erros relacionados a `produtos.ts` ou `actions.ts`.

- [ ] **Step 4: Teste manual via Supabase MCP (valida a query antes de ligar a UI)**

Não há test runner automatizado neste projeto para server actions (verificar: `find . -iname "*.test.ts" -not -path "*/node_modules/*"` — se vazio, confirma que o projeto não tem suite de testes JS, então a validação é manual via chamada real).

Crie um arquivo temporário `scripts-temp/test-ativar-lote.mjs` NÃO — em vez disso, valide via SQL direto (mais simples e não deixa código solto):

Pegue 2 IDs reais de teste:
```sql
select id, nome, ativo from produtos where nome in ('Vassoura Piacanyl', 'Aparelho de Barbear Bic com 5 Unidades');
```

Depois, simule a mesma operação que a função fará (UPDATE direto, para confirmar que o `.in("id", ids)` equivalente funciona e o trigger dispara):
```sql
update produtos set ativo = false where id in ('<id1>', '<id2>');
```

Run via `mcp__supabase__execute_sql`. Expected: 2 linhas afetadas.

Depois reverta:
```sql
update produtos set ativo = true where id in ('<id1>', '<id2>');
```

Isso confirma que o filtro `.in("id", ids)` com múltiplos IDs e update do campo `ativo` funciona como esperado antes de conectar a UI — a função TypeScript usa a mesma operação via supabase-js.

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/queries/produtos.ts "app/(crm)/precos/actions.ts"
git commit -m "feat(produtos): funcao ativarDesativarEmLote e server action correspondente"
```

---

## Task 3: Seleção múltipla e barra de ações no Catálogo

**Files:**
- Modify: `components/precos/catalogo-tab.tsx`

**Interfaces:**
- Consumes: `ativarDesativarProdutosAction(ids: string[], ativo: boolean)` de `@/app/(crm)/precos/actions` (produzido na Task 2).
- Produces: nenhuma interface nova exposta a outros arquivos — mudança contida neste componente.

- [ ] **Step 1: Importar a nova action**

No topo de `components/precos/catalogo-tab.tsx`, modifique a linha de import existente (linha 5):

```typescript
import { editarProdutoAction, ativarDesativarProdutosAction } from "@/app/(crm)/precos/actions";
```

- [ ] **Step 2: Adicionar estado de seleção**

Após a linha 55 (`const [filtros, setFiltros] = useState<Filtros>(filtrosIniciais);`), adicione:

```typescript
const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
```

- [ ] **Step 3: Adicionar funções de seleção**

Após a função `limparFiltros` (linha 100), adicione:

```typescript
function alternarSelecao(id: string) {
  setSelecionados((prev) => {
    const novo = new Set(prev);
    if (novo.has(id)) novo.delete(id);
    else novo.add(id);
    return novo;
  });
}

function alternarSelecionarTodos() {
  setSelecionados((prev) => {
    const todosVisiveisSelecionados = filtrados.every((p) => prev.has(p.id));
    if (todosVisiveisSelecionados) {
      const novo = new Set(prev);
      filtrados.forEach((p) => novo.delete(p.id));
      return novo;
    }
    const novo = new Set(prev);
    filtrados.forEach((p) => novo.add(p.id));
    return novo;
  });
}

function aplicarAcaoEmLote(ativo: boolean) {
  const ids = Array.from(selecionados);
  if (ids.length === 0) return;
  const acaoLabel = ativo ? "ativar" : "desativar";
  if (!confirm(`${ativo ? "Ativar" : "Desativar"} ${ids.length} produto${ids.length !== 1 ? "s" : ""} selecionado${ids.length !== 1 ? "s" : ""}?`)) return;

  setProdutos((prev) => prev.map((p) => (selecionados.has(p.id) ? { ...p, ativo } : p)));
  startTransition(async () => {
    try {
      await ativarDesativarProdutosAction(ids, ativo);
      setSelecionados(new Set());
    } catch {
      alert(`Falha ao ${acaoLabel} os produtos selecionados. Tente novamente.`);
    }
  });
}
```

Nota: `aplicarAcaoEmLote` não limpa `selecionados` em caso de erro (catch), permitindo retry — conforme decidido na spec. Em caso de sucesso, limpa a seleção.

- [ ] **Step 4: Adicionar checkbox de cabeçalho na tabela**

Modifique o `<colgroup>` (linhas 233-239) para incluir uma coluna de checkbox:

```typescript
<colgroup>
  {!somenteLeitura && <col className="w-[4%]" />}
  <col className="w-[26%]" />
  <col className="w-[12%] hidden sm:table-column" />
  <col className="w-[18%]" />
  <col className="w-[15%] hidden md:table-column" />
  {!somenteLeitura && <col className="w-[25%]" />}
</colgroup>
```

E o `<thead>` (linhas 240-248), adicionando a primeira `<th>`:

```typescript
<thead>
  <tr className="border-b border-border bg-surface-subtle">
    {!somenteLeitura && (
      <th className="px-3 py-2.5">
        <input
          type="checkbox"
          checked={filtrados.length > 0 && filtrados.every((p) => selecionados.has(p.id))}
          onChange={alternarSelecionarTodos}
          className="h-4 w-4 rounded border-border accent-brand cursor-pointer"
          aria-label="Selecionar todos"
        />
      </th>
    )}
    <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">Nome</th>
    <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide hidden sm:table-cell">Unidade</th>
    <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">Preço</th>
    <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide hidden md:table-cell">Status</th>
    {!somenteLeitura && <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted uppercase tracking-wide">Ações</th>}
  </tr>
</thead>
```

- [ ] **Step 5: Adicionar checkbox por linha**

No `<tbody>`, dentro do `.map((produto) => { ... return ( <tr> ... )})` (a partir da linha 263), adicione a primeira `<td>` logo após a abertura da `<tr>`:

```typescript
<tr key={produto.id} className="border-b border-border last:border-0 hover:bg-surface-subtle transition-colors group">
  {!somenteLeitura && (
    <td className="px-3 py-2.5">
      <input
        type="checkbox"
        checked={selecionados.has(produto.id)}
        onChange={() => alternarSelecao(produto.id)}
        className="h-4 w-4 rounded border-border accent-brand cursor-pointer"
        aria-label={`Selecionar ${produto.nome}`}
      />
    </td>
  )}
  <td className="px-3 py-2.5 font-medium text-foreground truncate">{produto.nome}</td>
  {/* ... resto das celulas existentes permanece igual ... */}
```

Ajuste também a célula vazia de "nenhum produto encontrado" (linha 250-256), que usa `colSpan={6}` — atualize para `colSpan={somenteLeitura ? 4 : 6}` (já estava incorreto antes mas agora a contagem de colunas mudou; mantenha consistente: 4 colunas em modo somente-leitura, 6 em modo edição incluindo a nova coluna de checkbox).

- [ ] **Step 6: Adicionar a barra de ações em massa**

Após o fechamento da `</div>` que envolve a tabela (logo antes do `<ImportarModal`, por volta da linha 367), adicione:

```typescript
{!somenteLeitura && selecionados.size > 0 && (
  <div className="sticky bottom-0 flex items-center justify-between gap-3 px-4 py-3 bg-surface border border-border rounded-xl shadow-lg">
    <p className="text-sm text-foreground">
      <span className="font-semibold">{selecionados.size}</span> produto{selecionados.size !== 1 ? "s" : ""} selecionado{selecionados.size !== 1 ? "s" : ""}
    </p>
    <div className="flex items-center gap-2">
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => aplicarAcaoEmLote(true)}>
        Ativar selecionados
      </Button>
      <Button size="sm" variant="destructive" disabled={pending} onClick={() => aplicarAcaoEmLote(false)}>
        Desativar selecionados
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => setSelecionados(new Set())}>
        Cancelar
      </Button>
    </div>
  </div>
)}
```

- [ ] **Step 7: Verificar compilação**

Run: `npx tsc --noEmit`

Expected: sem erros em `catalogo-tab.tsx`.

- [ ] **Step 8: Testar manualmente no browser**

Inicie o dev server: `npm run dev`

Navegue até a página de Preços/Catálogo (rota `/precos`, aba Catálogo). Verifique:
1. Cada linha tem um checkbox; marcar 2-3 produtos faz a barra de ações aparecer no rodapé com a contagem correta.
2. O checkbox "selecionar todos" no cabeçalho marca/desmarca todos os produtos **visíveis após o filtro atual** (teste filtrando por nome antes de marcar "selecionar todos" — produtos fora do filtro não devem ser afetados).
3. Clicar "Desativar selecionados" mostra o `confirm()` nativo com a contagem; confirmando, os produtos ficam com status "Inativo" na coluna Status e a seleção é limpa.
4. Clicar "Ativar selecionados" em produtos inativos os reativa.
5. Clicar "Cancelar" na barra limpa a seleção sem chamar a action.

Expected: todos os 5 comportamentos acima funcionam sem erros no console do browser.

- [ ] **Step 9: Commit**

```bash
git add components/precos/catalogo-tab.tsx
git commit -m "feat(catalogo): selecao multipla com ativar/desativar em massa"
```

---

## Self-Review Notes

- **Spec coverage:** Parte 1 (script) → Task 1. Parte 2 (UI) → Tasks 2 e 3. Soft-delete (excluir = desativar) já refletido em todo o plano, sem ação de delete real em nenhuma task.
- **Type consistency:** `ativarDesativarEmLote(ids: string[], ativo: boolean)` (Task 2) é consumida com a mesma assinatura em `ativarDesativarProdutosAction` (Task 2) e chamada com `(ids, ativo)` em `aplicarAcaoEmLote` (Task 3) — nomes e tipos consistentes em todas as tasks.
- **Placeholder scan:** nenhum "TBD"/"implementar depois" — todo código é completo e executável.
