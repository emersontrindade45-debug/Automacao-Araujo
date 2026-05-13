# Spec — Fluxo 6: Central de Comando do Dono

**Data:** 2026-05-09
**Projeto:** Araujo Hub — Automação de Atendimento (Açougue / Mercearia / Padaria)
**Status:** Aprovado pelo usuário

---

## 1. Objetivo

Permitir que o dono da loja atualize a base de conhecimento da IA (FAQ, produtos, configurações) via WhatsApp — por texto ou áudio — e que qualquer atendente possa pausar/reativar a IA com um único caractere (`.`), de forma segura e sem risco de quebrar os Fluxos 1–5 já em produção.

---

## 2. Escopo

### Inclui
- Detecção de prefixo `#admin` no Fluxo 1 (texto e áudio)
- Toggle de IA com `.` (qualquer número)
- Fluxo 6 completo: validação, classificação, atualização de Sheets, reindexação no Supabase Vector
- Planilha Google Sheets com 3 abas: FAQ, Produtos, Config
- Confirmação de toda ação via WhatsApp para o dono

### Não inclui
- Interface web de administração
- Múltiplos donos com permissões diferentes
- Histórico/auditoria de alterações
- Rollback de alterações

---

## 3. Arquitetura

### 3.1 Modificação no Fluxo 1 (mínima)

Adicionar **um Switch** logo após o nó `Normalizar Payload`, antes de qualquer processamento:

```
Normalizar Payload
        │
        ▼
Switch — Comando Especial?
        │
        ├─ mensagem == "." ──────────────► HTTP Request → Fluxo 6 (webhook)
        ├─ mensagem startsWith "#admin" ─► HTTP Request → Fluxo 6 (webhook)
        └─ qualquer outra coisa ─────────► fluxo normal (como hoje)
```

O HTTP Request para o Fluxo 6 passa o payload completo (telefone, mensagem, tipo de mídia, url de mídia se áudio).

### 3.2 Fluxo 6 — Central de Comando

```
Webhook Trigger (POST /webhook/central-comando)
        │
        ▼
Validar número do dono
(compara $json.telefone com variável de ambiente DONO_TELEFONE)
        │
        ├─ NÃO autorizado para #admin, mas é "." ──► Toggle IA (qualquer número pode)
        ├─ NÃO autorizado para #admin ─────────────► Fim silencioso
        │
        └─ autorizado (#admin)
               │
               ▼
        Switch — Tipo de mídia
               │
               ├─ audioMessage ──► Download áudio → Whisper → texto transcrito
               └─ texto ─────────► usa mensagem direta
               │
               ▼
        Limpar prefixo "#admin" do texto
               │
               ▼
        Agente IA (GPT-4o-mini)
        Classifica intenção + extrai dados estruturados
               │
        ┌──────┼──────────┐
        ▼      ▼          ▼
      faq   produto   configuracao
        │      │          │
   Sheets  Sheets     Sheets
    FAQ    Produtos    Config
   (upsert)(upsert)  (upsert)
        │      │          │
        └──────┴──────────┘
               │
               ▼
        Reindexar Supabase Vector Store
        (apaga documentos da categoria → reembedding)
               │
               ▼
        Enviar confirmação WhatsApp ao dono
        "✅ [categoria] atualizado com sucesso!"
```

### 3.3 Toggle IA (ponto ".")

```
Qualquer número envia "."
        │
        ▼
Buscar estado atual no Supabase
(tabela config_loja, campo ia_ativa)
        │
        ├─ ia_ativa = true  ──► atualiza para false → envia "⏸️ IA pausada"
        └─ ia_ativa = false ──► atualiza para true  → envia "▶️ IA reativada"
```

O Fluxo 1 já verifica `ia_ativa` antes de acionar a IA (verificação existente no Supabase).

---

## 4. Planilha Google Sheets

**Nome:** `Araujo Hub — Base de Conhecimento`
**Estrutura:** 3 abas

### Aba FAQ
| Pergunta | Resposta |
|---|---|
| Qual o horário de funcionamento? | Segunda a sábado, das 7h às 19h |
| Vocês entregam? | Sim, entregamos no raio de 5km |

### Aba Produtos
| Nome | Preço | Unidade | Ativo |
|---|---|---|---|
| Picanha | 98.00 | kg | sim |
| Frango inteiro | 18.00 | kg | sim |

### Aba Config
| Chave | Valor |
|---|---|
| horario_funcionamento | Segunda a sábado, 7h às 19h |
| area_entrega | Raio de 5km do centro |
| formas_pagamento | Pix, dinheiro, cartão |
| tempo_entrega | 30 a 60 minutos |
| taxa_entrega | Grátis acima de R$50 |

---

## 5. Agente IA — Classificação de Intenção

**Modelo:** GPT-4o-mini
**Input:** texto limpo (sem `#admin`)
**Output estruturado:**
```json
{
  "categoria": "faq" | "produto" | "configuracao",
  "acao": "atualizar" | "adicionar" | "remover",
  "dados": {
    "chave": "...",
    "valor": "..."
  }
}
```

**Exemplos de comandos do dono:**

| Comando | Categoria | Ação |
|---|---|---|
| `#admin horário amanhã é até 17h` | faq | atualizar |
| `#admin adiciona alcatra a R$75 o kg` | produto | adicionar |
| `#admin remove frango do cardápio` | produto | remover |
| `#admin entregamos agora até 8km` | configuracao | atualizar |
| `#admin não aceitamos mais cheque` | faq | atualizar |

---

## 6. Segurança

| Camada | Mecanismo |
|---|---|
| Autenticação `#admin` | Variável `DONO_TELEFONE` no N8n (lista de números autorizados) |
| Toggle `.` | Aberto a qualquer número — apenas alterna estado, sem acesso a dados |
| Confirmação obrigatória | Toda ação retorna resposta no WhatsApp — sem ação silenciosa |
| Prefixo obrigatório | Sem `#admin`, nenhuma mensagem do dono é processada como comando |

---

## 7. O que muda em cada fluxo

| Fluxo | Mudança | Risco |
|---|---|---|
| Fluxo 1 | +1 Switch + +1 HTTP Request no início | Mínimo — não altera lógica existente |
| Fluxo 2 | Nenhuma | Zero |
| Fluxo 3 | Nenhuma | Zero |
| Fluxo 4 | Nenhuma | Zero |
| Fluxo 5 | Nenhuma | Zero |
| Fluxo 6 | Novo, criado do zero | Zero impacto nos demais |

---

## 8. Dependências

- Credencial **Google Sheets** configurada no N8n (OAuth2)
- Credencial **OpenAI** já existente (`52clkHx8T3QEMNnB`)
- Credencial **Evolution API** já existente (`W5hKI38937XQAbl4`)
- Variável de ambiente `DONO_TELEFONE` no N8n (número(s) autorizado(s))
- Tabela `config_loja` no Supabase com campo `ia_ativa` (boolean)
- Supabase Vector Store já configurado (usado pelos Fluxos existentes)

---

## 9. Ordem de implementação

1. Criar planilha Google Sheets e popular dados iniciais
2. Criar credencial Google Sheets no N8n
3. Criar Fluxo 6 completo (inativo)
4. Testar Fluxo 6 isoladamente via webhook manual
5. Adicionar Switch + HTTP Request no Fluxo 1
6. Ativar Fluxo 6
7. Testar end-to-end: `#admin` texto → `#admin` áudio → toggle `.`
