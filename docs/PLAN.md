# Araujo Hub — Plano de Execução

> Automação de Atendimento para Varejo (Mercearias, Açougues, Padarias)
> Stack: Next.js 16 · React 19 · Supabase · Tailwind CSS 4 · N8n · WhatsApp · Instagram

---

## Visão geral das milestones

| # | Branch | Foco | Ordem |
|---|--------|------|-------|
| M1 | `feat/setup-e-design-system` | Setup, design system e layout base | 1º |
| M2 | `feat/crm-interface` | Interface CRM completa (Kanban, clientes, pedidos) | 2º |
| M3 | `feat/auth-e-banco` | Autenticação, banco e dados reais | 3º |
| M4 | `feat/webhooks-e-handoff` | Webhooks, integração N8n e handoff | 4º |
| M5 | `feat/precos-e-follow-up` | Atualização de preços e follow-up | 5º |
| M6 | `feat/deploy` | Deploy, variáveis de ambiente e go-live | 6º |
| M7 | `feat/n8n-flows` | Fluxos N8n com IA — atendimento, pedido, handoff, follow-up | 7º |

---

## M1 — Setup e Design System

**Branch:** `feat/setup-e-design-system`

**Objetivo:** Garantir que o projeto compila, tem estrutura de pastas correta, tokens de design definidos e um layout autenticado funcionando com dados mockados.

### Entregas

- [x] Ler `node_modules/next/dist/docs/` e anotar as breaking changes relevantes
- [x] Ajustar `app/layout.tsx` com metadados reais do projeto ("Araujo Hub")
- [x] Criar `app/globals.css` com variáveis de cor (brand, surface, muted, danger, success)
- [x] Criar componentes base em `components/ui/`:
  - [x] `Button` (variantes: primary, secondary, ghost, destructive)
  - [x] `Badge` (variantes por etapa do pipeline)
  - [x] `Card` e `CardHeader`/`CardContent`/`CardFooter`
  - [x] `Input`, `Textarea`, `Select`
  - [x] `Avatar` (iniciais do usuário)
  - [x] `Spinner` / loading state
- [x] Criar `components/layout/`:
  - [x] `Sidebar` com navegação (Kanban, Clientes, Pedidos, Preços)
  - [x] `Header` com nome do usuário, papel e logout
  - [x] `Shell` que combina Sidebar + Header + slot de conteúdo
- [x] Aplicar `Shell` no `app/(crm)/layout.tsx`
- [x] Criar página `/` (landpage pública) com formulário de captura de lead (nome, telefone, canal)
- [x] Garantir que `npm run build` passa sem erros

**Commit final:**
```
feat(M1): setup, design system e layout base autenticado
```

---

## M2 — Interface CRM

**Branch:** `feat/crm-interface`

**Objetivo:** Todas as telas do CRM funcionando com dados mockados — nenhuma chamada real ao banco ainda. Foco total na experiência, responsividade mobile-first e fluxo de uso.

### Entregas

#### Kanban
- [x] Criar `app/(crm)/kanban/page.tsx`
- [x] Componente `KanbanBoard` com colunas para cada `Etapa`:
  - `novo` · `atendimento` · `fechamento` · `pedido_gerado` · `separacao` · `em_rota` · `pos_venda` · `follow_up` · `marketing`
- [x] Componente `KanbanCard` com: nome do cliente, canal de origem, tempo na etapa, badge de etapa
- [x] Drag-and-drop de cards entre colunas (sem persistência por ora)
- [x] Painel lateral que abre ao clicar num card: histórico mockado, botão de handoff, detalhes do cliente

#### Clientes
- [x] Criar `app/(crm)/clientes/page.tsx`
- [x] Tabela com busca, filtro por canal (`whatsapp` | `instagram` | `landpage`) e filtro por etapa
- [x] Linha expansível com último contato e etapa atual
- [x] Página de detalhe `app/(crm)/clientes/[id]/page.tsx` com: dados do cliente, histórico de pedidos, etapa atual e botão para mover etapa

#### Pedidos
- [x] Criar `app/(crm)/pedidos/page.tsx`
- [x] Lista de pedidos com filtro por status
- [x] Componente `PedidoCard` com itens, total, endereço de entrega e método de pagamento
- [x] Página de detalhe `app/(crm)/pedidos/[id]/page.tsx` com itens editáveis e ação de confirmação

#### Preços
- [x] Criar `app/(crm)/precos/page.tsx`
- [x] Tabela de produtos com preço atual e `StatusPreco` (`pendente` | `aprovado` | `rejeitado`)
- [x] Ação de aprovar / rejeitar atualização de preço
- [x] Indicador visual de preços pendentes no sidebar

#### Dados mock
- [x] Criar `lib/mock/clientes.ts`, `lib/mock/pedidos.ts`, `lib/mock/produtos.ts` com dados realistas em português
- [x] Garantir que `npm run build` passa sem erros

**Commit final:**
```
feat(M2): interface CRM completa com dados mockados
```

---

## M3 — Autenticação e Banco de Dados

**Branch:** `feat/auth-e-banco`

**Objetivo:** Supabase conectado, banco migrado, autenticação real funcionando e todas as telas do CRM consumindo dados reais.

### Entregas

#### Banco de dados
- [x] Criar migração `supabase/migrations/001_schema_inicial.sql` com tabelas:
  - `clientes` (id, nome, telefone, canal_origem, etapa_atual, criado_em, atualizado_em)
  - `produtos` (id, nome, preco, unidade, ativo, criado_em)
  - `pedidos` (id, cliente_id, itens jsonb, status, endereco_entrega, metodo_pagamento, total, criado_em, atualizado_em)
  - `precos` (id, produto_id, preco_novo, status, solicitado_por, criado_em)
  - `logs` (id, tipo, payload jsonb, criado_em)
- [x] Criar migração `002_rls_policies.sql` com Row Level Security por papel (`Papel`)
- [x] Rodar `supabase db push` e validar tabelas no dashboard
- [x] Popular banco com seed de dados realistas para desenvolvimento

#### Autenticação
- [x] Configurar login com email/senha no Supabase Auth
- [x] Criar `app/(public)/login/page.tsx` com formulário de login
- [x] Criar `app/(public)/login/actions.ts` com Server Action de login
- [x] Redirecionar para `/kanban` após login bem-sucedido
- [x] Logout no `Header` via Server Action
- [x] Middleware já protege rotas — validar que redireciona para `/login` corretamente

#### Integração real
- [x] Substituir dados mock por Server Components com queries Supabase em todas as páginas
- [x] Implementar Supabase Realtime no `KanbanBoard` (atualização em tempo real de cards)
- [x] Criar `lib/supabase/queries/` com funções tipadas para cada entidade
- [x] Criar Server Actions em cada módulo para mutações (mover etapa, confirmar pedido, aprovar preço)

#### Seed e testes manuais
- [x] Criar usuário de teste para cada `Papel` no Supabase Auth
- [x] Validar visibilidade de dados por papel via RLS
- [x] Garantir que `npm run build` passa sem erros

**Commit final:**
```
feat(M3): autenticação real e banco de dados integrado
```

---

## M4 — Webhooks e Integração N8n

**Branch:** `feat/webhooks-e-handoff`

**Objetivo:** Receber eventos externos (WhatsApp, Instagram, N8n), processar handoffs e disponibilizar dados no CRM em tempo real.

### Entregas

#### Webhook WhatsApp
- [x] Criar `app/api/webhooks/whatsapp/route.ts`
- [x] Verificação de token GET (desafio do Meta)
- [x] Handler POST: receber mensagem, upsert cliente, registrar log, mover etapa para `atendimento`
- [x] Validar assinatura HMAC com `WHATSAPP_TOKEN`
- [x] Escrever tipos para payload do WhatsApp Business API

#### Webhook Instagram
- [x] Criar `app/api/webhooks/instagram/route.ts`
- [x] Mesma lógica: verificação GET + handler POST
- [x] Upsert cliente com `canal_origem: "instagram"`

#### Webhook N8n (handoff)
- [x] Criar `app/api/webhooks/n8n/route.ts`
- [x] Receber `HandoffPayload` (definido em `lib/types/index.ts`)
- [x] Validar secret com `N8N_WEBHOOK_SECRET`
- [x] Aplicar regras de handoff:
  - Mensagem ambígua → etapa `atendimento`
  - Pedido confirmado → etapa `pedido_gerado`, criar registro em `pedidos`
  - Separação completa → etapa `em_rota`
  - Sem resposta → etapa `follow_up`
- [x] Disparar notificação Resend para o atendente responsável ao receber handoff crítico

#### Integração N8n
- [x] Criar `lib/n8n/client.ts` com função para chamar webhooks de saída do N8n
- [x] Criar `lib/n8n/payloads.ts` com builders tipados de payload
- [x] Documentar em `docs/N8N.md` o fluxo de eventos: entrada → processamento → handoff

#### Testes manuais
- [x] Testar webhook WhatsApp com `curl` simulando payload do Meta
- [x] Testar webhook N8n com payload de handoff
- [x] Validar que card aparece no Kanban em tempo real via Realtime
- [x] Garantir que `npm run build` passa sem erros

**Commit final:**
```
feat(M4): webhooks WhatsApp, Instagram e handoff N8n integrados
```

---

## M5 — Atualização de Preços e Follow-up

**Branch:** `feat/precos-e-follow-up`

**Objetivo:** Fluxo completo de atualização de preços via WhatsApp (voz e texto) e campanha de follow-up para leads frios.

### Entregas

#### Atualização de preços via WhatsApp
- [x] Criar `app/api/webhooks/whatsapp/price-update/route.ts` ou estender handler existente
- [x] Detectar mensagens de atualização de preço (texto estruturado: "preço [produto] [valor]")
- [x] Para áudio: criar `lib/openai/whisper.ts` com chamada à API Whisper para transcrição
- [x] Criar registro em `precos` com `status: "pendente"`
- [x] Enviar notificação Resend para admin com link de aprovação
- [x] Página `app/(crm)/precos/page.tsx` já existente — conectar ações de aprovar/rejeitar às Server Actions reais

#### Follow-up
- [x] Criar `app/api/followup/route.ts` — endpoint chamado por cron (N8n ou Vercel Cron)
- [x] Listar clientes em `etapa: "follow_up"` com mais de X dias sem atualização
- [x] Disparar mensagem de reativação via N8n
- [x] Registrar tentativa de follow-up em `logs`
- [x] Mover para `marketing` se sem resposta após N tentativas configuráveis

#### Configurações de admin
- [x] Criar `app/(crm)/configuracoes/page.tsx` (só acessível a `papel: "admin"`)
- [x] Formulário para: dias de inatividade para follow-up, número de tentativas, mensagem padrão de follow-up
- [x] Garantir que `npm run build` passa sem erros

**Commit final:**
```
feat(M5): atualização de preços via áudio/texto e follow-up automático
```

---

## M6 — Deploy e Go-Live

**Branch:** `feat/deploy`

**Objetivo:** Aplicação em produção no Vercel, variáveis de ambiente configuradas, banco de produção no Supabase, domínio apontado e monitoramento básico ativo.

### Entregas

#### Variáveis de ambiente
- [x] Listar todas as variáveis de `.env.local` e configurar no Vercel (Production + Preview)
- [x] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [x] `RESEND_API_KEY`, `N8N_WEBHOOK_SECRET`
- [x] `WHATSAPP_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `INSTAGRAM_TOKEN`
- [x] `OPENAI_API_KEY`

#### Banco de produção
- [ ] Criar projeto Supabase de produção (separado do de desenvolvimento)
- [ ] Rodar migrações no projeto de produção
- [ ] Configurar RLS e validar com usuário de teste de produção
> **Nota:** projeto usa único Supabase em produção (`zziapgnenvugyvrgrhrs`). Separação dev/prod não foi feita — decisão arquitetural pendente.

#### Deploy
- [x] Conectar repositório ao Vercel
- [ ] Configurar domínio personalizado (se disponível)
- [x] Validar build de produção: `npm run build` sem erros e sem warnings críticos
- [x] Testar fluxo completo em produção: receber mensagem WhatsApp → aparecer no Kanban → handoff → pedido

#### Webhooks de produção
- [x] Atualizar URL do webhook no painel do Meta (WhatsApp + Instagram) para URL de produção

  > Evolution API substitui integração Meta direta — URL configurada na Evolution API

- [x] Atualizar URL de callback no N8n para URL de produção
- [x] Validar verificação de token em produção

#### Monitoramento
- [x] Ativar logs do Vercel e configurar alertas de erro
- [x] Criar `app/api/health/route.ts` — endpoint `/api/health` retornando status do banco
- [x] Documentar em `docs/RUNBOOK.md`: como adicionar produto, como aprovar preço, como tratar handoff travado

#### Go-live checklist
- [x] Login funcionando com usuário real de cada papel (commit `35c7b88`, RBAC implementado)
- [x] Kanban recebendo cards em tempo real (M8 Supabase Realtime ativo em `produtos`)
- [x] Webhook WhatsApp verificado pelo Meta (Evolution API — sem verificação Meta direta)
- [x] Atualização de preço via WhatsApp funcionando end-to-end
- [ ] Follow-up acionando após período configurado
- [ ] Sem erros 5xx nos logs do Vercel nas primeiras 24h

**Commit final:**
```
feat(M6): deploy em produção e go-live validado
```

---

## Ordem de execução recomendada

```
M1 (interface base) → M2 (CRM com mock) → M3 (banco + auth real)
      → M4 (webhooks + N8n) → M5 (preços + follow-up) → M6 (deploy)
      → M7 (fluxos N8n com IA)  ← pode rodar em paralelo a M6
      → M8 (catálogo editável + Realtime)  ← concluído
```

> **Princípio:** interface antes de backend. Validar a experiência com dados mockados antes de investir em integrações. Cada milestone entrega valor independente e pode ser demonstrada ao cliente.
>
> **M7** depende das URLs de produção (geradas em M6), mas pode ser construído e testado localmente em paralelo ao deploy.

---

---

## M7 — Fluxos N8n com IA

**Branch:** `feat/n8n-flows`

**Objetivo:** Configurar dentro do N8n todos os fluxos de automação com IA (GPT-4o) para atendimento completo — do recebimento da mensagem até o handoff estruturado de volta ao Hub, incluindo follow-up e notificação de preços.

> **Pré-requisito:** M6 concluído (URLs de produção disponíveis). Pode ser desenvolvido localmente em paralelo a M6 usando `ngrok` ou equivalente.

### Entregas

#### Fluxo 1 — Atendimento Principal (WhatsApp / Instagram → IA → Resposta)

- [x] Criar workflow **"Atendimento Principal"** no N8n (ID: `OM5p23yhXYNjCVxQ`, ATIVO)
- [x] **Nó Webhook (Trigger):** recebe payload da Evolution API em `/webhook/araujo-entrada`
- [x] **Nó HTTP Request:** busca contexto do cliente no Supabase (`GET /rest/v1/clientes?telefone=eq.{{telefone}}`)
- [x] **Nó HTTP Request:** busca catálogo de produtos via Hub (`GET /api/produtos`)
- [x] **Nó OpenAI (GPT-4o):** prompt completo com catálogo, etapa e instrução de retornar JSON `{resposta, intencao}`
- [x] **Nó IF:** ramifica por `intencao` (`fazer_pedido` → Fluxo 2, demais → resposta direta)
- [x] **Nó HTTP Request (Evolution API):** envia `resposta` ao cliente via WhatsApp
- [x] **Nó IF (follow_up):** curto-circuito para follow-ups — envia diretamente sem chamar IA

#### Fluxo 2 — Fechamento de Pedido (coleta estruturada via IA)

Acionado quando `intencao = "fazer_pedido"`:

- [x] Criar workflow **"Fechamento de Pedido"** (ID: `rnv9wmmIUx4RyRvq`, ATIVO)
- [x] **Nó OpenAI Agent (GPT-4o):** conduz conversa em múltiplos turnos para coletar itens, endereço, pagamento e observações
- [x] **Nó IF:** verifica se `pedido_completo = true`
- [x] **Nó HTTP Request:** chama `POST /api/webhooks/n8n` com `tipo: "pedido_confirmado"` quando completo
- [x] **Nó HTTP Request (Evolution API):** envia resposta/solicitação ao cliente a cada turno

#### Fluxo 3 — Handoff para Humano

Acionado quando `intencao = "humano"` ou após N turnos sem conclusão:

- [x] Criar workflow **"Handoff para Humano"** (ID: `dQLYeN7LLiM8oQbN`, ATIVO)
- [x] **Nó HTTP Request:** chama `POST /api/webhooks/n8n` com `tipo: "ambiguo"`
- [x] **Nó HTTP Request (Evolution API):** envia mensagem padrão ao cliente informando que atendente assumirá

#### Fluxo 4 — Follow-up Automático (Cron)

- [x] Criar workflow **"Follow-up Cron"** (ID: `9PmgWdUIJ1v42gdk`, ATIVO)
- [x] **Nó Schedule Trigger:** execução diária às 09:00, segunda a sábado (`0 9 * * 1-6`)
- [x] **Nó HTTP Request:** chama `POST /api/followup` com header `x-cron-secret`
- [x] **Nó IF:** verifica status da resposta (`ok: true`) e registra resultado em Log Sucesso/Erro

#### Fluxo 5 — Notificação de Preço Aprovado

Acionado quando Hub chama o webhook de notificação de preço:

- [x] Criar workflow **"Notificação de Preço Aprovado"** (ID: `Jkz0rL9Yum1ErXij`, ATIVO)
- [x] **Nó Webhook (Trigger):** recebe payload `{ produto_nome, preco_novo, solicitado_por }`
- [x] **Nó HTTP Request (Evolution API):** envia mensagem ao número de `solicitado_por` com preço atualizado

#### Setup de Ferramentas MCP (pré-requisito)

- [x] Instalar 7 skills n8n em `~/.claude/skills/` (n8n-expression-syntax, n8n-mcp-tools-expert, n8n-workflow-patterns, n8n-validation-expert, n8n-node-configuration, n8n-code-javascript, n8n-code-python)
- [x] Confirmar n8n-mcp instalado globalmente e conectado a `n8n.evoapi.shop`
- [x] Adicionar Supabase MCP ao `.mcp.json` e autenticar via OAuth 2.1
- [x] Proteger `.mcp.json` no `.gitignore` (contém API keys)

#### Configuração e Credenciais

- [x] Configurar credencial **OpenAI** no N8n (`API Key` → `OPENAI_API_KEY`, ID: `w8nIui9qhEXhVDh4`)
- [x] Configurar credencial **HTTP Header Auth** `Hub N8n Secret` para validar chamadas de entrada do Hub
- [x] Configurar credencial **HTTP Header Auth** `Evolution API` com apikey para chamadas à Evolution API
- [x] Valores hardcoded nos nodes (N8N_BLOCK_ENV_ACCESS_IN_NODE=true no Easypanel impede uso de $env):
  - `HUB_URL` → `https://araujo-hub.vercel.app`
  - `SUPABASE_URL` → `https://zziapgnenvugyvrgrhrs.supabase.co`
  - `CRON_SECRET` → `cron-secret-araujo-2026`
- [x] Exportar todos os workflows como JSON e salvar em `n8n/workflows/` no repositório
- [x] Documentar em `docs/N8N-FLOWS.md` com IDs, URLs e instruções de importação

**Commit final:**

```text
feat(M7): fluxos N8n com IA — atendimento, fechamento, handoff e follow-up
```

---

---

## M8 — Catálogo Editável, Estoque e Realtime

**Branch:** `main`

**Objetivo:** Transformar `/precos` em ponto central de gestão — catálogo editável inline, campo de estoque, importação via planilha e sincronização bidirecional em tempo real com o Supabase.

### Entregas

- [x] Adicionar campo `estoque_atual` (int4) à tabela `produtos` no Supabase
- [x] Atualizar tipo `Produto` em `lib/types/index.ts` com `estoque_atual: number`
- [x] Adicionar queries `updateProduto`, `upsertProdutosEmLote`, `LinhaPlanilha` em `lib/supabase/queries/produtos.ts`
- [x] Adicionar Server Actions `editarProdutoAction`, `importarProdutosAction` em `app/(crm)/precos/actions.ts`
- [x] Instalar `papaparse` e `xlsx` para parse de planilhas no cliente
- [x] Criar `components/precos/catalogo-tab.tsx` — tabela editável inline (preço, estoque, ativo) com filtros por todas as colunas
- [x] Criar `components/precos/importar-modal.tsx` — modal com parse CSV/XLSX, prévia e confirmação em lote
- [x] Criar `components/precos/precos-page-client.tsx` — layout com abas Catálogo / Solicitações
- [x] Atualizar `app/(crm)/precos/page.tsx` para buscar produtos em paralelo e renderizar abas
- [x] Tornar status das solicitações editável a qualquer momento via select (pendente/aprovado/rejeitado)
- [x] Adicionar `alterarStatusPrecoAction` para alterar status em qualquer direção
- [x] Corrigir RLS: mutations de `precos` e `produtos` passam a usar `createAdminClient()` (service role)
- [x] Habilitar `produtos` na publication `supabase_realtime` no Supabase dashboard
- [x] Adicionar Supabase Realtime no `CatalogoTab` — sincronização automática ao receber UPDATE externo (N8n, dashboard, API)

**Commits:** `1dcec44` → `dd89235`

---

---

## M9 — Fluxos N8n Avançados e Otimizações

**Branch:** `main`

**Objetivo:** Ampliar os fluxos N8n com capacidades avançadas (semântica, CEP, preços por áudio), RBAC completo no Hub e refinamento do agente de atendimento.

### Entregas

#### Fluxos N8n adicionais

- [x] **Fluxo 6 — Cadastro de Endereço:** consulta ViaCEP por CEP ou por UF/cidade/rua; fallback cidade = Guarujá quando não informada
- [x] **Fluxo 7 — Atualização de Preços via WhatsApp:** texto estruturado e áudio (Whisper); cria registro `precos` com `status: "pendente"`
- [x] **Fluxo 8 — Busca Semântica de Produtos:** embeddings OpenAI + `match_documents` pgvector no Supabase
- [x] **Fluxo 9 — Busca por Categoria:** lista produtos filtrados por categoria via Supabase

#### Agente de Atendimento (Fluxo 1)

- [x] Prompt `Agente Atendimento1` refatorado: cabeçalho JSON estruturado (`name`, `context`, `base_de_conhecimento`), roteiro de 3 passos, regra anti-alucinação
- [x] Intents finais: `saudacao | consulta_preco | fazer_pedido | fechar_pedido | humano`
- [x] Intent `duvida` removida — RAG injeta base de conhecimento antes do agente via `Montar Prompt2`
- [x] Intent `fora_escopo` renomeada para `humano` — qualquer caso não atendido pela IA vai para handoff
- [x] `Parse Resposta IA2`: fallback de intent alterado de `consulta_preco` para `humano`
- [x] `Montar Prompt2`: instrução de CEP removida (tratado pelo Fluxo 6)
- [x] Ferramenta `busca_cep` removida do agente

#### RBAC e Configurações

- [x] Middleware de RBAC completo por papel (`admin`, `atendimento`, `separacao`, `expedicao`, `followup`)
- [x] Sidebar dinâmica exibindo apenas rotas acessíveis ao papel atual
- [x] Página `/configuracoes` restrita a `admin` com gestão de funcionários autorizados
- [x] Fluxo 5 valida funcionário autorizado no Supabase antes de executar ação

**Commits:** `81515c2` → `177aa14`

---

## Referências

- PRD completo: [docs/PRD.md](./PRD.md)
- Breaking changes Next.js: `node_modules/next/dist/docs/`
- Tipos do domínio: [lib/types/index.ts](../lib/types/index.ts)
- Supabase clients: [lib/supabase/](../lib/supabase/)
- Middleware de auth: [middleware.ts](../middleware.ts)
- Integração N8n (endpoints e payloads): [docs/N8N.md](./N8N.md)
