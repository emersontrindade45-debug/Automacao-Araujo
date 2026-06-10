# Checklist de Implantação — No Cliente

## Uso exclusivo do desenvolvedor

> Tudo já está configurado e rodando. Esta lista cobre apenas o que precisa ser trocado para o cliente específico: número de WhatsApp, nome da loja, domínio e credenciais da instância.

---

## Bloco 1 — Evolution API (WhatsApp)

Criar a instância nova no painel da EvoAPI para o número do cliente.

- [ ] Criar nova instância no painel EvoAPI com o nome do cliente
- [ ] Conectar o número de WhatsApp da loja (escanear QR Code)
- [ ] Aguardar status: **Connected**
- [ ] Anotar os dados da instância criada:
  - `EVOLUTION_INSTANCE` = nome dado à instância
  - `EVOLUTION_INSTANCE_ID` = UUID gerado (aparece no painel)
  - `EVOLUTION_API_KEY` = chave da instância
  - `EVOLUTION_PHONE` = número no formato `5513XXXXXXXXX:5`

- [ ] Configurar webhook de entrada na instância:

  ```txt
  URL: https://araujo-hub.vercel.app/api/webhooks/whatsapp
  Header: apikey: <valor atual de WHATSAPP_VERIFY_TOKEN>
  Evento: messages.upsert
  ```

- [ ] Criar grupo WhatsApp de notificações internas com os operadores da loja
- [ ] Obter o JID do grupo (painel Evolution ou via API)
  - `WHATSAPP_GROUP_NOTIF_JID` = `xxxxxxxxxxxxxxx@g.us`

---

## Bloco 2 — Variáveis de ambiente no Vercel

Acessar: vercel.com → projeto → Settings → Environment Variables

Trocar apenas as variáveis abaixo (as demais já estão corretas):

| Variável | Valor atual (Araujo) | Substituir por |
| --- | --- | --- |
| `EVOLUTION_INSTANCE` | `Araujo` | nome da nova instância |
| `EVOLUTION_INSTANCE_ID` | UUID antigo | UUID da nova instância |
| `EVOLUTION_API_KEY` | chave antiga | chave da nova instância |
| `EVOLUTION_PHONE` | `5511918340928:5` | número do cliente formato `55DDXXXXXXXXX:5` |
| `WHATSAPP_GROUP_NOTIF_JID` | JID antigo | JID do novo grupo |

- [ ] Atualizar todas as variáveis acima
- [ ] Fazer redeploy: Vercel → Deployments → botão Redeploy no último deploy

---

## Bloco 3 — N8n (workflows)

As credenciais do N8n apontam para a EvoAPI. Nos nós que enviam mensagem via WhatsApp, o body contém o nome da instância. Precisa atualizar.

- [ ] Abrir o N8n → localizar todos os nós HTTP Request que contenham `"instance": "Araujo"` no body
- [ ] Trocar o valor do campo `instance` para o nome da nova instância
- [ ] Fazer o mesmo nos fluxos: 1, 2, 3, 5, 7, 13
- [ ] Salvar e verificar que os fluxos continuam ativos (toggle verde)

---

## Bloco 4 — Código (2 arquivos)

Dois valores estão hardcoded no código e precisam ser trocados:

### `lib/whatsapp/notificacoes.ts`

- [ ] Linha 9 — trocar `"Araujo"` pelo nome da nova instância (fallback de instância)
- [ ] Linha 11 — trocar o JID hardcoded pelo JID do novo grupo

### `app/api/webhooks/n8n/route.ts`

- [ ] Linha 184 — trocar `"Araujo Hub <noreply@araujohub.com.br>"` pelo e-mail do novo cliente

Após as alterações:

- [ ] Fazer commit e push
- [ ] Vercel faz deploy automático — aguardar concluir

---

## Bloco 5 — Frontend (nome visível da loja)

Arquivos que exibem "Araujo Hub" para o usuário:

| Arquivo | O que trocar |
| --- | --- |
| `app/layout.tsx` linha 13–14 | Título do browser: `"Araujo Hub"` |
| `app/layout.tsx` linha 18 | URL base hardcoded → URL do novo cliente |
| `app/page.tsx` linha 6 | Título da landpage |
| `app/page.tsx` linha 78 | Rodapé: `© Araujo Hub` |
| `components/layout/header.tsx` linha 23 | Nome no cabeçalho do Hub |

- [ ] Substituir "Araujo Hub" / "Mercado Araujo" pelo nome do novo cliente em todos os arquivos acima
- [ ] Fazer commit e push

---

## Bloco 6 — Domínio (se o cliente tiver domínio próprio)

Se o cliente usar domínio próprio (ex: `hub.mercadoaraujo.com`) em vez do `.vercel.app`:

- [ ] Vercel → Settings → Domains → adicionar domínio
- [ ] Apontar DNS para a Vercel (CNAME ou A conforme instrução exibida)
- [ ] Atualizar `NEXT_PUBLIC_SITE_URL` no Vercel com o novo domínio
- [ ] Atualizar `app/layout.tsx` linha 18 com o novo domínio
- [ ] Redeploy

---

## Bloco 7 — Catálogo inicial

- [ ] Receber do cliente planilha de produtos (CSV ou Excel)
  - Colunas esperadas: `nome`, `unidade`, `preco_atual`, `estoque_atual`, `categoria`
- [ ] Hub → Preços → Importar planilha
- [ ] Conferir se os produtos aparecem corretamente na listagem
- [ ] Cadastrar ofertas e kits da semana: Hub → Ofertas e Kits → + Novo

---

## Bloco 8 — Configurações iniciais no Hub

### Primeiro usuário admin

- [ ] Supabase → Authentication → Users → Invite user (e-mail do proprietário)
- [ ] Após login, atualizar `app_metadata` com `{ "papel": "admin" }`

### Demais usuários

- [ ] Hub → Configurações → Usuários e papéis → Convidar novo usuário
- [ ] Definir papel: Admin ou Atendimento

### Funcionários autorizados (atualização de preço via WhatsApp)

- [ ] Hub → Configurações → Funcionários autorizados
- [ ] Cadastrar número de cada funcionário no formato `5513XXXXXXXXX`

### Follow-up

- [ ] Hub → Configurações → Follow-up automático
- [ ] Ajustar dias de inatividade e mensagens com o tom da loja do cliente

---

## Bloco 9 — Base de conhecimento (dúvidas frequentes)

- [ ] Criar planilha Google Sheets com colunas: `Pergunta` | `Resposta`
- [ ] Preencher com as dúvidas mais comuns da loja:
  - Horário de funcionamento
  - Área de entrega
  - Formas de pagamento
  - Taxa ou pedido mínimo
  - Tempo estimado de entrega
  - Política de cancelamento
- [ ] Configurar credencial do Google Sheets no N8n (OAuth ou Service Account)
- [ ] Testar: mandar `#admin Qual o horário? Abrimos às 8h` no WhatsApp da loja → confirmar que foi salvo

---

## Bloco 10 — Validação rápida (testar antes de entregar)

Execute cada item e marque só quando funcionar:

- [ ] Mensagem nova no WhatsApp → assistente pede o nome → atende normalmente
- [ ] Perguntar preço de produto cadastrado → resposta correta
- [ ] Fazer pedido completo → pedido aparece no Hub
- [ ] Avançar pedido para Em Rota no Hub → cliente recebe notificação no WhatsApp
- [ ] Cliente pedir atendente → IA para → notificação chega no grupo com resumo
- [ ] Responder cliente diretamente → IA não interfere → enviar `.` → IA reativa
- [ ] Mandar `#preços produto 99,90` → preço atualizado no catálogo
- [ ] Mandar `#admin pergunta? resposta` → base de conhecimento atualizada
- [ ] Perguntar horário → assistente responde com o que foi ensinado

---

## Bloco 11 — Entregar ao cliente

- [ ] Mostrar o manual operacional (`MANUAL_OPERACIONAL_WHATSAPP.md`) e explicar os comandos:
  - `#admin` → ensinar dúvida nova
  - `#preços` → atualizar preço
  - `#estoque` → atualizar estoque
  - `.` → reativar assistente
  - Responder normalmente → assumir atendimento
- [ ] Confirmar que o proprietário sabe reconectar o WhatsApp se desconectar (QR Code na EvoAPI)
- [ ] Deixar contato para suporte

---

## Referência rápida — só o que muda por cliente

| O que muda | Onde fica |
| --- | --- |
| Nome da instância WhatsApp | Vercel env `EVOLUTION_INSTANCE` + N8n body dos nós HTTP + `notificacoes.ts` linha 9 |
| Número do WhatsApp da loja | Vercel env `EVOLUTION_PHONE` |
| UUID da instância | Vercel env `EVOLUTION_INSTANCE_ID` |
| API Key da instância | Vercel env `EVOLUTION_API_KEY` |
| JID do grupo de notificações | Vercel env `WHATSAPP_GROUP_NOTIF_JID` + `notificacoes.ts` linha 11 |
| E-mail remetente | `app/api/webhooks/n8n/route.ts` linha 184 |
| Nome da loja no frontend | `app/layout.tsx`, `app/page.tsx`, `header.tsx` |
| Domínio (se tiver) | Vercel Domains + `NEXT_PUBLIC_SITE_URL` + `app/layout.tsx` linha 18 |

---

Checklist de implantação — uso interno do desenvolvedor. Versão: junho de 2026
