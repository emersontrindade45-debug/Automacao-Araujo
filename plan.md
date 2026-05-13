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

## M8 — Concluído (2026-05-13)

- [x] Catálogo de produtos editável inline (preço, estoque, ativo) na página `/precos`
- [x] Filtros por todas as colunas (nome, unidade, preço, estoque, status)
- [x] Importação em lote via CSV/XLSX com prévia e validação
- [x] Status das solicitações de preço editável em qualquer direção (pendente/aprovado/rejeitado)
- [x] Fix RLS: mutations usam `createAdminClient()` com service role
- [x] Supabase Realtime em `produtos` — Hub atualiza automaticamente quando N8n ou dashboard alteram o banco
