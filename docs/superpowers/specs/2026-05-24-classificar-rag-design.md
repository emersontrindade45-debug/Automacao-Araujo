# Design: Classificador de Intenção RAG

**Data:** 2026-05-24  
**Escopo:** Cirúrgico — 1 node adicionado, 1 node modificado, nada mais tocado

---

## Problema

O node `IF RAG?` verificava se `mensagem_completa` era igual a string vazia — condição que nunca era verdadeira para mensagens reais. Isso fazia toda mensagem cair no False Branch, nunca roteando para o RAG.

Exemplo que falhou: `"Boa Tarde queria saber as ofertas de hoje?"` → False Branch (errado).

---

## Solução

Inserir um node `Classificar RAG` (Code JS) imediatamente antes do `IF RAG?`. Ele analisa a `mensagem_original` via regex e adiciona o campo `usar_rag: true/false` ao JSON. O `IF RAG?` passa a ler esse campo.

---

## Fluxo

```
ANTES:
Mensagem Completa → IF RAG? (condição quebrada) → False Branch sempre

DEPOIS:
Mensagem Completa → Classificar RAG → IF RAG? (lê usar_rag) → True/False Branch corretamente
```

---

## Node: `Classificar RAG`

**Tipo:** Code (JavaScript)  
**Posição:** Entre `Mensagem Completa` e `IF RAG?`

### Casos de uso cobertos

| Categoria | Exemplos |
|---|---|
| Ofertas | "ofertas de hoje", "o que tem de oferta", "oferta boa" |
| Promoções | "tem promoção?", "promoo", "promo", "tá em promoção?" |
| Descontos | "tem desconto?", "desconto pra mim", "desconto especial" |
| Liquidação/Saldão | "liquidação", "saldão", "queima de estoque" |
| Preço baixo | "mais barato", "baratinho", "tá barato?", "precinho" |
| Black Friday / datas | "black friday", "black", "dia das mães", "natal" |
| Cupom / frete | "cupom", "frete grátis", "frete gratis", "tem frete?" |
| % off | "10% off", "50% de desconto" |
| Dúvidas da loja | "dúvida", "pergunta", "quero saber", "me informa" |
| Horário | "horário", "horario", "que horas", "abre", "fecha", "funcionamento" |
| Endereço | "endereço", "endereco", "onde fica", "localização", "localizacao" |
| Contato | "telefone", "whatsapp", "email", "contato", "falar com" |
| Funcionamento | "funciona", "aberto", "fechado", "dias de atendimento" |

### Código

```javascript
const msg = ($input.item.json.mensagem_original || '').toLowerCase();

const padraoRag = /ofer[ta]|promoc|promoç|promo\b|descont|liquidac|liquidaç|saldao|saldão|queima.*estoque|mais.*barat|baratinho|precinho|black.*friday|\bblack\b|dia.*maes|dia.*namorad|natal|ano.*novo|cupom|frete.*grat|grat.*frete|\d+\s*%|%\s*off|d[uú]vida|pergunta|quero.*saber|me.*inform|hor[aá]rio|que.*horas|abre|fecha|funcionamento|funcion|endere[cç]o|onde.*fica|localiz|telefone|whatsapp|e.?mail|contato|falar.*com|atendimento|horario/i;

const usar_rag = padraoRag.test(msg);

return [{ json: { ...$input.item.json, usar_rag } }];
```

**Importante:** todos os campos do item são preservados (`...item.json`). Apenas `usar_rag` é adicionado.

---

## Node: `IF RAG?`

### Condição atual (errada)
```
{{ $('Mensagem Completa').item.json.mensagem_completa }} is equal to [vazio]
```

### Nova condição
```
{{ $json.usar_rag }}  is equal to  true
```

**Convert types where required:** ativado (para garantir comparação booleana).

---

## O que NÃO muda

- Conexões existentes do `IF RAG?` com os nodes downstream
- Nodes de memória Redis
- Agente principal e seu contexto
- Qualquer outro node do fluxo

---

## Resultado esperado

| Mensagem | `usar_rag` | Branch |
|---|---|---|
| "Boa Tarde queria saber as ofertas de hoje?" | `true` | True → RAG |
| "tem desconto?" | `true` | True → RAG |
| "qual o horário de vocês?" | `true` | True → RAG |
| "quero fazer um pedido" | `false` | False → fluxo normal |
| "oi tudo bem?" | `false` | False → fluxo normal |
