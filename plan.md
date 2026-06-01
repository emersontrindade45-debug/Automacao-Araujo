# Plano — Automação Atendimento

## Setup de Ferramentas MCP e Skills

- [x] Instalar n8n-skills (7 skills) em `~/.claude/skills/`
  - n8n-expression-syntax
  - n8n-mcp-tools-expert
  - n8n-workflow-patterns
  - n8n-validation-expert
  - n8n-node-configuration
  - n8n-code-javascript
  - n8n-code-python
- [x] Configurar n8n-mcp local (já instalado via npm global, conectado a `n8n.evoapi.shop`)
- [x] Adicionar Supabase MCP ao `.mcp.json` (`https://mcp.supabase.com/mcp`)
- [x] Autenticar Supabase MCP via OAuth 2.1
- [x] Proteger `.mcp.json` no `.gitignore` (contém API keys)

## Próximos Passos

- [x] Elaborar fluxos n8n com IA (atendimento, fechamento, handoff, follow-up) — M7 concluído
- [x] Integrar Supabase com fluxos n8n — Realtime ativo em `produtos`, mutations via service role
- [x] Implementar RBAC completo — middleware, sidebar, acesso por papel (`admin`, `atendimento`, `separacao`, `expedicao`, `followup`)
- [x] Funcionários autorizados — menu de configurações com gestão de usuários por admin
- [x] Fluxo 5 com restrição por funcionário autorizado — autorização via Supabase antes de executar ação
- [x] Fluxo 6 — Cadastro de endereço via CEP (ViaCEP) com fallback para cidade Guarujá
- [x] Fluxo 7 — Atualização de preços via WhatsApp (texto/áudio)
- [x] Fluxo 8 — Busca semântica de produtos com embeddings + pgvector
- [x] Fluxo 9 — Busca por categoria de produtos
- [x] Prompt `Agente Atendimento1` otimizado: cabeçalho JSON estruturado, roteiro anti-alucinação, intents `saudacao|consulta_preco|fazer_pedido|fechar_pedido|humano`
- [x] RAG (Fluxo 1): Agente RAG injeta base de conhecimento antes de `Agente Atendimento1` — intent `duvida` removida
- [x] CEP removido do agente — tratado exclusivamente pelo Fluxo 6

## M10 — Ajustes e Validações (2026-06-01)

- [x] Planilha modelo de importação atualizada com colunas `categoria` e `validade` (alinhada à tabela `produtos` no Supabase)
- [x] `LinhaPlanilha` e `upsertProdutosEmLote` atualizados para persistir `categoria` e `validade` no banco
- [x] Tabela de prévia do modal de importação exibe as novas colunas
- [x] Colunas opcionais — planilhas sem `categoria`/`validade` continuam funcionando normalmente

---

## M9 — Fluxos N8n Avançados e Otimizações (2026-05-23)

- [x] Fluxo 6: CEP com fallback cidade Guarujá — `Consulta CEP2` e `Consultar ViaCep`
- [x] Fluxo 7: Atualização de preços via WhatsApp (texto e áudio com Whisper)
- [x] Fluxo 8: Busca semântica via embeddings e pgvector (`match_documents`)
- [x] Fluxo 9: Busca por categoria de produtos
- [x] RBAC completo com middleware e sidebar dinâmica por papel
- [x] Funcionários autorizados gerenciáveis em `/configuracoes`
- [x] Fluxo 5 com verificação de funcionário autorizado no Supabase
- [x] Prompt `Agente Atendimento1` refatorado com cabeçalho JSON + roteiro anti-alucinação
- [x] Parse Resposta IA2: fallback de intent alterado para `humano`
- [x] Montar Prompt2: instrução CEP removida, intents atualizados

---

## M8 — Concluído (2026-05-13)

- [x] Catálogo de produtos editável inline (preço, estoque, ativo) na página `/precos`
- [x] Filtros por todas as colunas (nome, unidade, preço, estoque, status)
- [x] Importação em lote via CSV/XLSX com prévia e validação
- [x] Status das solicitações de preço editável em qualquer direção (pendente/aprovado/rejeitado)
- [x] Fix RLS: mutations usam `createAdminClient()` com service role
- [x] Supabase Realtime em `produtos` — Hub atualiza automaticamente quando N8n ou dashboard alteram o banco
