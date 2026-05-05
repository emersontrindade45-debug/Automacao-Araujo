# Araujo Hub — Runbook de Operações

> Guia de referência rápida para operações do dia a dia: adicionar produto, aprovar preço, tratar handoff travado e verificar saúde do sistema.

---

## Índice

1. [Verificar saúde do sistema](#1-verificar-saúde-do-sistema)
2. [Adicionar produto ao catálogo](#2-adicionar-produto-ao-catálogo)
3. [Aprovar ou rejeitar atualização de preço](#3-aprovar-ou-rejeitar-atualização-de-preço)
4. [Tratar handoff travado no Kanban](#4-tratar-handoff-travado-no-kanban)
5. [Reenviar follow-up manualmente](#5-reenviar-follow-up-manualmente)
6. [Atualizar variáveis de ambiente em produção](#6-atualizar-variáveis-de-ambiente-em-produção)
7. [Verificar logs de erro](#7-verificar-logs-de-erro)
8. [Procedimento de rollback](#8-procedimento-de-rollback)

---

## 1. Verificar saúde do sistema

**Endpoint:** `GET /api/health`

Retorna status do banco de dados e latência. Use para verificar se a aplicação e o Supabase estão operacionais.

```bash
curl https://<seu-dominio>/api/health
```

Resposta esperada (200):
```json
{
  "status": "ok",
  "db": "connected",
  "latency_ms": 42,
  "timestamp": "2026-05-05T12:00:00.000Z"
}
```

Resposta de erro (503):
```json
{
  "status": "error",
  "db": "unreachable",
  "error": "mensagem de erro",
  "timestamp": "2026-05-05T12:00:00.000Z"
}
```

Se o status for `error`, verifique:
- As variáveis `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estão corretas no Vercel
- O projeto Supabase está ativo (dashboard em [supabase.com](https://supabase.com))
- Logs do Vercel em `vercel logs <url-do-deploy>`

---

## 2. Adicionar produto ao catálogo

**Via Supabase Dashboard:**

1. Acesse o [Supabase Dashboard](https://supabase.com) → projeto de produção → Table Editor
2. Abra a tabela `produtos`
3. Clique em **Insert row** e preencha:
   - `nome`: nome do produto (ex: `Alcatra`)
   - `preco`: preço atual em decimal (ex: `45.90`)
   - `unidade`: unidade de medida (ex: `kg`, `un`, `pct`)
   - `ativo`: `true`
4. Salve. O produto aparece imediatamente no catálogo do CRM.

**Via SQL (para múltiplos produtos):**

```sql
INSERT INTO produtos (nome, preco, unidade, ativo)
VALUES
  ('Alcatra', 45.90, 'kg', true),
  ('Frango inteiro', 12.50, 'kg', true),
  ('Pão francês', 0.75, 'un', true);
```

---

## 3. Aprovar ou rejeitar atualização de preço

Quando um fornecedor ou atendente envia uma atualização de preço via WhatsApp, ela entra com `status: "pendente"` na tabela `precos`.

**Via CRM (recomendado):**

1. Acesse `/precos` no CRM — o badge no sidebar indica quantas atualizações estão pendentes
2. Clique em **Aprovar** ou **Rejeitar** na linha do produto
3. Ao aprovar, o preço é atualizado na tabela `produtos` e o N8n notifica o solicitante via WhatsApp

**Via Supabase (emergência):**

```sql
-- Aprovar manualmente
UPDATE precos SET status = 'aprovado' WHERE id = '<uuid>';
UPDATE produtos SET preco = <novo_preco> WHERE id = (
  SELECT produto_id FROM precos WHERE id = '<uuid>'
);

-- Rejeitar
UPDATE precos SET status = 'rejeitado' WHERE id = '<uuid>';
```

---

## 4. Tratar handoff travado no Kanban

Um card pode ficar travado numa etapa quando o N8n não consegue processar o handoff ou a mensagem não chega ao atendente.

**Verificar o log do evento:**

```sql
SELECT * FROM logs
WHERE payload->>'cliente_id' = '<uuid-do-cliente>'
ORDER BY criado_em DESC
LIMIT 10;
```

**Mover etapa manualmente:**

1. No CRM, abra `/clientes/<id>`
2. Use o botão **Mover etapa** e selecione a etapa correta
3. Ou via SQL:

```sql
UPDATE clientes
SET etapa_atual = 'atendimento', atualizado_em = NOW()
WHERE id = '<uuid>';
```

**Etapas válidas:**
`novo` → `atendimento` → `fechamento` → `pedido_gerado` → `separacao` → `em_rota` → `pos_venda` → `follow_up` → `marketing`

**Verificar webhook N8n:**
- Acesse o painel N8n e verifique execuções com erro no workflow **"Atendimento Principal"**
- Re-execute a última falha se o erro foi temporário (timeout, rate limit)

---

## 5. Reenviar follow-up manualmente

Para disparar o follow-up fora do horário do cron:

```bash
curl -X POST https://<seu-dominio>/api/followup \
  -H "x-cron-secret: <CRON_SECRET>"
```

Sem `CRON_SECRET` configurado, a chamada é aceita sem autenticação (útil em ambiente de desenvolvimento).

**Configurar parâmetros de follow-up:**

1. Acesse `/configuracoes` no CRM (apenas papel `admin`)
2. Ajuste:
   - **Dias de inatividade:** quantos dias sem resposta antes de disparar follow-up (padrão: 3)
   - **Máximo de tentativas:** quantas vezes tentar antes de mover para `marketing` (padrão: 3)
   - **Mensagem padrão:** texto enviado ao cliente

---

## 6. Atualizar variáveis de ambiente em produção

Para atualizar uma variável de ambiente (ex: novo token do WhatsApp):

```bash
# Via Vercel CLI
vercel env add WHATSAPP_TOKEN production

# Ou via dashboard
# https://vercel.com/<team>/araujo-hub/settings/environment-variables
```

Após alterar variáveis **não** prefixadas com `NEXT_PUBLIC_`, é necessário fazer um novo deploy para que entrem em vigor:

```bash
vercel --prod
```

Variáveis `NEXT_PUBLIC_*` requerem rebuild (o valor é injetado em build time).

---

## 7. Verificar logs de erro

**Logs do Vercel:**
```bash
vercel logs https://<url-do-deploy> --follow
```

Ou no dashboard: [vercel.com](https://vercel.com) → projeto → Deployments → selecionar deploy → Functions

**Logs internos (tabela `logs`):**

```sql
-- Últimos 50 eventos
SELECT tipo, payload, criado_em
FROM logs
ORDER BY criado_em DESC
LIMIT 50;

-- Filtrar por tipo
SELECT * FROM logs
WHERE tipo IN ('followup_disparado', 'handoff_recebido', 'preco_pendente')
ORDER BY criado_em DESC;
```

**Tipos de log relevantes:**

| Tipo | Descrição |
|---|---|
| `followup_disparado` | Follow-up enviado ao cliente |
| `followup_movido_marketing` | Cliente movido para marketing |
| `handoff_recebido` | Handoff recebido do N8n |
| `preco_pendente` | Nova atualização de preço aguardando aprovação |
| `webhook_whatsapp` | Mensagem recebida via WhatsApp |
| `webhook_instagram` | Mensagem recebida via Instagram |

---

## 8. Procedimento de rollback

Se um deploy com problema precisar ser revertido:

**Via Vercel Dashboard:**
1. Acesse [vercel.com](https://vercel.com) → projeto → Deployments
2. Encontre o último deploy estável
3. Clique nos três pontos → **Promote to Production**

**Via Vercel CLI:**
```bash
# Listar deployments recentes
vercel ls

# Promover deploy anterior para produção
vercel promote <deployment-url> --scope <team>
```

**Verificar após rollback:**
```bash
curl https://<seu-dominio>/api/health
```

---

## Contatos e referências

- **Supabase Dashboard:** [supabase.com](https://supabase.com)
- **Vercel Dashboard:** [vercel.com](https://vercel.com)
- **N8n:** URL configurada em `N8N_WEBHOOK_HANDOFF_URL`
- **Documentação dos fluxos N8n:** [docs/N8N.md](./N8N.md)
- **Plano de execução:** [docs/PLAN.md](./PLAN.md)
