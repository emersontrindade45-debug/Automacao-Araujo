# PRD: AI Retail Automation Hub

## 1. Visão do Produto

O **AI Retail Automation Hub** é uma plataforma de automação de atendimento e operação comercial para mercearias, açougues e padarias.

Possui entrada por:

- Landpage
- WhatsApp
- Instagram

A orquestração é feita via **N8n**, com registro em um **CRM próprio** com:

- Funil visual (Kanban)
- Cards
- Histórico operacional

O sistema transforma:

- Leads → Pedidos
- Pedidos → Separação
- Separação → Entrega

Incluindo:

- Follow-up
- Marketing
- Reativação

---

## 2. Problema

Hoje o negócio perde leads e vendas porque:

- Atendimento digital é manual e repetitivo
- Canais são dispersos
- Há sobrecarga em horários de pico

Além disso:

- Falta distribuição clara de tarefas
- Não há acompanhamento eficiente dos pedidos
- O funil não é executado de forma consistente

---

## 3. Objetivos

- Centralizar entrada de leads (landpage, WhatsApp, Instagram)
- Automatizar atendimento e triagem com N8n
- Criar CRM próprio com Kanban e histórico por cliente
- Organizar trabalho com handoff explícito
- Permitir atualização de preços via WhatsApp (texto e áudio)

---

## 4. Escopo Funcional

### 4.1 Canais de Entrada

- Landpage
- WhatsApp
- Instagram

A landpage inicia o fluxo. WhatsApp e Instagram continuam e fecham a venda.

### 4.2 Atendimento Automatizado

O N8n responde sobre:

- Preços
- Entrega
- Funcionamento
- Produtos
- Ofertas

O sistema deve:

- Identificar intenção
- Detectar etapa do funil
- Decidir entre automação ou humano

### 4.3 Fechamento

Coleta obrigatória:

- Itens
- Quantidade
- Forma de pagamento
- Endereço
- Observações

### 4.4 Pedido e Operação

Status do funil:

1. Novo
2. Atendimento
3. Fechamento
4. Pedido gerado
5. Em separação
6. Em rota
7. Pós-venda
8. Follow-up
9. Marketing/Ofertas

### 4.5 Atualização de Preços e Estoque

Via WhatsApp (texto ou áudio):

1. Transcrever (se áudio)
2. Interpretar
3. Validar
4. Aplicar

**Via Hub (manual):**

- Editar inline na tabela de Catálogo (`/precos` → aba Catálogo)
- Importar planilha CSV/XLSX em lote

**Via N8n (automático):**

- Fluxo N8n atualiza `preco_atual` / `estoque_atual` direto no Supabase
- Hub reflete a mudança em tempo real via Supabase Realtime (sem recarregar a página)

---

## 5. Papéis e Responsabilidades

### 5.1 Administrador
- Configurar catálogo, preços, automações, canais
- Monitorar métricas

### 5.2 Atendimento
- Monitorar canais
- Validar dados e assumir casos complexos
- Confirmar fechamento

### 5.3 Separação
- Receber pedidos, separar itens, atualizar status

### 5.4 Expedição/Entrega
- Confirmar saída, atualizar "em rota", registrar entrega

### 5.5 Follow-up
- Monitorar pedidos não fechados
- Reativar clientes, enviar ofertas, apoiar pós-venda

---

## 6. Handoff (Automação ↔ Humano)

### Regras de Handoff

| Gatilho | Destino |
|---|---|
| Mensagem ambígua | Atendimento |
| Pedido confirmado | Separação |
| Separação concluída | Expedição |
| Lead sem resposta | Follow-up |
| Atualização de preço | Validação |

### Dados obrigatórios no handoff

- Nome, Telefone, Canal de origem
- Etapa do funil, Últimas mensagens
- Itens do pedido, Próxima ação

---

## 7. Requisitos do CRM

- Kanban visual por etapa do funil
- Histórico por cliente
- Origem do lead, tags e status
- Alertas, busca e filtros

### Regras automáticas de movimentação

| Evento | Destino |
|---|---|
| Lead qualificado | Atendimento |
| Pedido fechado | Fechamento |
| Pedido gerado | Separação |
| Separação concluída | Entrega |
| Pós-venda | Follow-up |
| Campanhas | Marketing |

---

## 8. Arquitetura Técnica

### Orquestração
- N8n (motor principal de automação)

### Banco de Dados
- Supabase / PostgreSQL

Tabelas: `clientes`, `pedidos`, `produtos`, `precos`, `tags`, `etapas`, `logs`

### Frontend
- Next.js 15
- Mobile-first
- Realtime via Supabase

### Integrações
- WhatsApp Business API
- Instagram Messaging API
- Landpage / Formulário
- Supabase Realtime
- Resend (e-mail)

---

## 9. Fluxo Operacional

1. Cliente entra (landpage / WhatsApp / Instagram)
2. N8n identifica intenção
3. Responde automaticamente (se simples)
4. Conduz ao fechamento
5. Gera pedido
6. Handoff para separação
7. Separação executa
8. Expedição entrega
9. Pós-venda e follow-up

---

## 10. Requisitos Não Funcionais

- Alta performance em pico
- Resposta rápida
- Histórico consistente
- Controle de acesso por papel (RBAC)
- Mobile-first

---

## 11. Milestones

| Marco | Entrega |
|---|---|
| M1 | Entrada + CRM básico |
| M2 | Respostas automáticas |
| M3 | Geração de pedido + handoff |
| M4 | CRM completo com Kanban |
| M5 | Follow-up + campanhas |
| M6 | Atualização de preço por voz |

---

## 12. Critério de Sucesso

O sistema deve:

- Reduzir perda de leads
- Aumentar conversão
- Organizar operação
- Garantir handoff claro
- Permitir atualização rápida de preços

> Projeto: Automação Atendimento Araújo
