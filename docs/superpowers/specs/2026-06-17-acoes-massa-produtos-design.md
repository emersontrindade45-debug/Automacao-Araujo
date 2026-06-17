# Ações em massa em produtos (planilha + Hub)

## Contexto

A tabela `produtos` no Supabase hoje tem ~27.700 registros após a importação/conciliação de preços do ERP (ver `dados/conciliar_precos.py`, `dados/atualizar_precos.py`). Não existe hoje nenhum mecanismo para:

- Ativar/desativar produtos em massa (individualmente, só via Table Editor do Supabase ou um a um na UI).
- Aplicar ações em massa via planilha com semântica explícita por linha (a importação atual em `lib/supabase/queries/produtos.ts::upsertProdutosEmLote` sempre faz upsert + `ativo=true`, sem opção de desativar).
- Selecionar múltiplos produtos no Catálogo (Hub) e agir sobre eles de uma vez.

Anteriormente, `upsertProdutosEmLote` também *deletava* produtos ausentes da planilha — esse comportamento foi removido por risco de perda de dados (ver commit anterior nesta mesma sessão). "Excluir" produtos, portanto, significa **soft-delete** (`ativo=false`), nunca remoção da linha.

## Escopo

1. Script Python `dados/aplicar_acoes_produtos.py` para aplicar ações em massa via planilha.
2. Função de upsert em lote no Catálogo (Hub): seleção múltipla + ativar/desativar.

Fora de escopo (explicitamente adiado): delete definitivo de linhas, edição de categoria em massa na UI, ações em massa diferentes de ativar/desativar na UI.

## Parte 1 — Script de planilha

Arquivo: `dados/aplicar_acoes_produtos.py`.

### Entrada

Planilha `.xlsx` com colunas: `nome` (obrigatório), `acao` (opcional), `unidade`, `preco_atual`, `categoria`, `nicho`, `validade`.

Valores aceitos em `acao` (case-insensitive, espaços ignorados): `upsert`, `ativar`, `desativar`. Célula vazia é tratada como `upsert` (compatibilidade com planilhas que não têm a coluna `acao`, como `produtos_hub_precos_conciliados.xlsx`).

### Comportamento por ação

- **`upsert`**: upsert por `nome` (cria se não existe, atualiza se existe) com todos os campos preenchidos na linha. Sempre força `ativo=true`. Mesma lógica de dedupe de `atualizar_precos.py` não se aplica aqui (a planilha de entrada é responsabilidade de quem a gera; nomes duplicados na mesma planilha geram erro reportado, não são silenciosamente resolvidos).
- **`ativar`**: update por `nome`, **somente** campo `ativo=true`. Demais colunas da linha (preço, categoria etc.) são ignoradas mesmo se preenchidas.
- **`desativar`**: update por `nome`, **somente** campo `ativo=false`. Mesma regra de ignorar demais colunas.
- Para `ativar`/`desativar`: se o `nome` não existir na tabela, a linha é pulada e registrada em um relatório de avisos — não interrompe o processamento das demais linhas.

### Execução

- Reaproveita o padrão de `dados/atualizar_precos.py`: envio em lotes pequenos (50) com pausa (8s) via REST API do Supabase (`Prefer: resolution=merge-duplicates` para upsert; PATCH individual por nome para ativar/desativar, já que PostgREST não faz update em lote com valores idênticos de forma nativa em uma única request por nome distinto — manter consistência com o que já existe).
- Suporta `--dry-run` (mostra contagem por ação, não grava) e `--limite N` (teste com amostra).
- Log final: contagem de upserts aplicados, ativados, desativados, linhas puladas (com motivo: nome não encontrado, ação inválida, nome duplicado dentro da planilha).
- Cada update no banco dispara o trigger `produtos_embedding_trigger` existente — comportamento já coberto, nenhuma ação extra necessária aqui (ver memória `project_embedding_trigger_produtos`).

## Parte 2 — UI do Hub (Catálogo)

Arquivo principal: `components/precos/catalogo-tab.tsx`. Nova query: `lib/supabase/queries/produtos.ts`.

### Comportamento

- Checkbox no início de cada linha da tabela de produtos + checkbox "selecionar todos" no cabeçalho, que seleciona/desmarca todos os itens **atualmente visíveis após o filtro aplicado** (não seleciona itens fora do filtro).
- Quando 1+ produto está selecionado, uma barra fixa aparece (rodapé ou logo acima da tabela, seguindo o padrão visual já usado em outras telas do Hub) mostrando "N selecionados" e dois botões: **Ativar selecionados** e **Desativar selecionados**.
- Ao clicar em um dos botões, exibe confirmação simples (dialog leve, já no padrão de componentes existentes) com a contagem afetada antes de aplicar.
- Após confirmar, chama a nova função `ativarDesativarEmLote(ids: string[], ativo: boolean)` em `lib/supabase/queries/produtos.ts`, que faz update em lote (`.in("id", ids)`) só do campo `ativo`.
- Ao concluir, a seleção é limpa e a tabela revalida (mesmo padrão de `revalidatePath` usado nas demais actions de produtos).

### Fora de escopo desta UI

- Não há edição de categoria, preço ou qualquer outro campo em massa nesta fase.
- Não há exclusão (delete real) em massa na UI — segue não existindo, como decidido nesta sessão.

## Erros e validação

- Script: linha com `acao` fora dos 3 valores aceitos é reportada como erro e pulada (não trava o restante).
- Script: `nome` vazio é sempre pulado e reportado.
- UI: se a chamada de update falhar, exibe erro e mantém a seleção (não limpa a seleção em caso de falha, para permitir retry).
