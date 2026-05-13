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

- [ ] Elaborar fluxos n8n com IA (atendimento, fechamento, handoff, follow-up)
- [ ] Integrar Supabase com fluxos n8n (projeto "Atendimento Whats")
