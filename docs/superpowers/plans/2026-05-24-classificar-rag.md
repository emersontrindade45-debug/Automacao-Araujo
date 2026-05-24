# Classificador de Intenção RAG — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inserir o node `Classificar RAG` antes do `IF RAG?` no fluxo n8n de atendimento e corrigir a condição do `IF RAG?` para rotear corretamente mensagens sobre ofertas, promoções, descontos e dúvidas da loja.

**Architecture:** Um node Code (JavaScript) é adicionado entre `Mensagem Completa` e `IF RAG?`. Ele inspeciona `mensagem_original` com regex abrangente e injeta `usar_rag: true/false` no JSON. O `IF RAG?` passa a comparar `$json.usar_rag === true`. Nenhum outro node é alterado.

**Tech Stack:** n8n (interface web), JavaScript (node Code), regex nativo JS.

---

## Arquivos envolvidos

- **Nenhum arquivo de código é alterado** — toda a implementação é feita diretamente na interface do n8n.
- Referência do spec: `docs/superpowers/specs/2026-05-24-classificar-rag-design.md`

---

### Task 1: Adicionar o node `Classificar RAG` no canvas

**Contexto:** O node deve ficar entre `Mensagem Completa` e `IF RAG?`. A conexão atual entre esses dois nodes será substituída por: `Mensagem Completa → Classificar RAG → IF RAG?`.

- [ ] **Step 1: Abrir o fluxo no n8n**

  Acesse o fluxo de atendimento principal no n8n (Fluxo 1 — Atendimento). Identifique visualmente os nodes `Mensagem Completa` e `IF RAG?` no canvas.

- [ ] **Step 2: Remover a conexão atual entre `Mensagem Completa` e `IF RAG?`**

  Clique na seta/conexão entre `Mensagem Completa` e `IF RAG?` e delete-a. Os dois nodes ficam desconectados.

- [ ] **Step 3: Adicionar node Code entre os dois**

  Clique em `+` no canvas (ou arraste da saída de `Mensagem Completa`) e selecione o tipo **Code**. Nomeie o node como `Classificar RAG`.

- [ ] **Step 4: Colar o código JavaScript no node**

  Na aba **Code** do node, selecione linguagem **JavaScript** e cole exatamente:

  ```javascript
  const msg = ($input.item.json.mensagem_original || '').toLowerCase();

  const padraoRag = /ofer[ta]|promoc|promoç|promo\b|descont|liquidac|liquidaç|saldao|saldão|queima.*estoque|mais.*barat|baratinho|precinho|black.*friday|\bblack\b|dia.*maes|dia.*namorad|natal|ano.*novo|cupom|frete.*grat|grat.*frete|\d+\s*%|%\s*off|d[uú]vida|pergunta|quero.*saber|me.*inform|hor[aá]rio|que.*horas|abre|fecha|funcionamento|funcion|endere[cç]o|onde.*fica|localiz|telefone|whatsapp|e.?mail|contato|falar.*com|atendimento|horario/i;

  const usar_rag = padraoRag.test(msg);

  return [{ json: { ...$input.item.json, usar_rag } }];
  ```

- [ ] **Step 5: Reconectar os nodes**

  - Conecte a saída de `Mensagem Completa` à entrada de `Classificar RAG`
  - Conecte a saída de `Classificar RAG` à entrada de `IF RAG?`

- [ ] **Step 6: Testar o node isoladamente**

  Com o node `Classificar RAG` selecionado, clique em **Test step**. Use como input um item com:
  ```json
  { "mensagem_original": "Boa Tarde queria saber as ofertas de hoje?" }
  ```
  Resultado esperado no output:
  ```json
  { "mensagem_original": "Boa Tarde queria saber as ofertas de hoje?", "usar_rag": true }
  ```

- [ ] **Step 7: Testar com mensagem não-RAG**

  Ainda no **Test step**, use:
  ```json
  { "mensagem_original": "quero fazer um pedido" }
  ```
  Resultado esperado:
  ```json
  { "mensagem_original": "quero fazer um pedido", "usar_rag": false }
  ```

---

### Task 2: Corrigir a condição do node `IF RAG?`

**Contexto:** A condição atual compara `mensagem_completa` com string vazia — nunca verdadeiro. A nova condição compara `usar_rag` com `true`.

- [ ] **Step 1: Abrir o node `IF RAG?`**

  Clique no node `IF RAG?` no canvas para abrir seus parâmetros.

- [ ] **Step 2: Localizar a condição existente**

  Na aba **Conditions**, a condição atual é:
  ```
  {{ $('Mensagem Completa').item.json.mensagem_completa }}  is equal to  [vazio]
  ```

- [ ] **Step 3: Substituir o valor do lado esquerdo**

  Altere o campo esquerdo (Value 1) de:
  ```
  {{ $('Mensagem Completa').item.json.mensagem_completa }}
  ```
  Para:
  ```
  {{ $json.usar_rag }}
  ```

- [ ] **Step 4: Ajustar o valor do lado direito**

  Altere o campo direito (Value 2) para o booleano `true` (não string — use o toggle de tipo se disponível).

- [ ] **Step 5: Garantir que "Convert types where required" está ativo**

  Na seção **Options** do node, verifique que a opção **Convert types where required** está habilitada. Isso garante que a comparação booleana funcione mesmo se `usar_rag` chegar como string.

- [ ] **Step 6: Testar o node `IF RAG?` isoladamente**

  Clique em **Test step** com o node `IF RAG?` selecionado. Verifique:

  - Input `{ "usar_rag": true }` → output na **True Branch**
  - Input `{ "usar_rag": false }` → output na **False Branch**

---

### Task 3: Teste de ponta a ponta

**Contexto:** Verificar que o fluxo completo roteia corretamente para as duas branches.

- [ ] **Step 1: Disparar teste com mensagem RAG**

  Envie uma mensagem de teste para o webhook do fluxo (via WhatsApp de teste ou ferramenta como Postman/n8n manual trigger) com:
  ```
  "Boa Tarde queria saber as ofertas de hoje?"
  ```
  Verifique nos logs de execução do n8n que:
  - `Classificar RAG` → `usar_rag: true`
  - `IF RAG?` → **True Branch** executada

- [ ] **Step 2: Disparar teste com mensagem não-RAG**

  Envie:
  ```
  "quero fazer um pedido"
  ```
  Verifique nos logs:
  - `Classificar RAG` → `usar_rag: false`
  - `IF RAG?` → **False Branch** executada

- [ ] **Step 3: Testar variações de palavras-chave RAG**

  Envie ao menos 3 mensagens adicionais para cobrir categorias diferentes:

  | Mensagem de teste | `usar_rag` esperado |
  |---|---|
  | "tem desconto pra mim?" | `true` |
  | "qual o horário de vocês?" | `true` |
  | "onde fica a loja?" | `true` |
  | "oi tudo bem?" | `false` |

  Confirme que todas roteiam corretamente.

- [ ] **Step 4: Salvar o fluxo no n8n**

  Clique em **Save** no fluxo para persistir as alterações.

---

## Checklist final

- [ ] Node `Classificar RAG` adicionado entre `Mensagem Completa` e `IF RAG?`
- [ ] Código JavaScript colado corretamente (sem truncamento)
- [ ] Conexões refeitas: `Mensagem Completa → Classificar RAG → IF RAG?`
- [ ] Condição do `IF RAG?` lê `$json.usar_rag == true`
- [ ] "Convert types where required" ativado no `IF RAG?`
- [ ] Testes de ponta a ponta passando para ambas as branches
- [ ] Fluxo salvo no n8n
