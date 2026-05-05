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
- [ ] Testar webhook WhatsApp com `curl` simulando payload do Meta
- [ ] Testar webhook N8n com payload de handoff
- [ ] Validar que card aparece no Kanban em tempo real via Realtime
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
- [ ] Criar `app/api/webhooks/whatsapp/price-update/route.ts` ou estender handler existente
- [ ] Detectar mensagens de atualização de preço (texto estruturado: "preço [produto] [valor]")
- [ ] Para áudio: criar `lib/openai/whisper.ts` com chamada à API Whisper para transcrição
- [ ] Criar registro em `precos` com `status: "pendente"`
- [ ] Enviar notificação Resend para admin com link de aprovação
- [ ] Página `app/(crm)/precos/page.tsx` já existente — conectar ações de aprovar/rejeitar às Server Actions reais

#### Follow-up
- [ ] Criar `app/api/followup/route.ts` — endpoint chamado por cron (N8n ou Vercel Cron)
- [ ] Listar clientes em `etapa: "follow_up"` com mais de X dias sem atualização
- [ ] Disparar mensagem de reativação via N8n
- [ ] Registrar tentativa de follow-up em `logs`
- [ ] Mover para `marketing` se sem resposta após N tentativas configuráveis

#### Configurações de admin
- [ ] Criar `app/(crm)/configuracoes/page.tsx` (só acessível a `papel: "admin"`)
- [ ] Formulário para: dias de inatividade para follow-up, número de tentativas, mensagem padrão de follow-up
- [ ] Garantir que `npm run build` passa sem erros

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
- [ ] Listar todas as variáveis de `.env.local` e configurar no Vercel (Production + Preview)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `RESEND_API_KEY`, `N8N_WEBHOOK_SECRET`
- [ ] `WHATSAPP_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `INSTAGRAM_TOKEN`
- [ ] `OPENAI_API_KEY`

#### Banco de produção
- [ ] Criar projeto Supabase de produção (separado do de desenvolvimento)
- [ ] Rodar migrações no projeto de produção
- [ ] Configurar RLS e validar com usuário de teste de produção

#### Deploy
- [ ] Conectar repositório ao Vercel
- [ ] Configurar domínio personalizado (se disponível)
- [ ] Validar build de produção: `npm run build` sem erros e sem warnings críticos
- [ ] Testar fluxo completo em produção: receber mensagem WhatsApp → aparecer no Kanban → handoff → pedido

#### Webhooks de produção
- [ ] Atualizar URL do webhook no painel do Meta (WhatsApp + Instagram) para URL de produção
- [ ] Atualizar URL de callback no N8n para URL de produção
- [ ] Validar verificação de token em produção

#### Monitoramento
- [ ] Ativar logs do Vercel e configurar alertas de erro
- [ ] Criar `app/api/health/route.ts` — endpoint `/api/health` retornando status do banco
- [ ] Documentar em `docs/RUNBOOK.md`: como adicionar produto, como aprovar preço, como tratar handoff travado

#### Go-live checklist
- [ ] Login funcionando com usuário real de cada papel
- [ ] Kanban recebendo cards em tempo real
- [ ] Webhook WhatsApp verificado pelo Meta
- [ ] Atualização de preço via WhatsApp funcionando end-to-end
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
```

> **Princípio:** interface antes de backend. Validar a experiência com dados mockados antes de investir em integrações. Cada milestone entrega valor independente e pode ser demonstrada ao cliente.

---

## Referências

- PRD completo: [docs/PRD.md](./PRD.md)
- Breaking changes Next.js: `node_modules/next/dist/docs/`
- Tipos do domínio: [lib/types/index.ts](../lib/types/index.ts)
- Supabase clients: [lib/supabase/](../lib/supabase/)
- Middleware de auth: [middleware.ts](../middleware.ts)
