# Design: Classificador RAG com Google Sheets + Cache Redis

**Data:** 2026-05-24  
**Escopo:** Cirúrgico — apenas o código interno do node `Classificar RAG` é substituído. Nenhum outro node, conexão ou fluxo é tocado.

---

## Problema

O node `Classificar RAG` atual usa um regex hardcoded. Para adicionar novos termos é necessário editar código no n8n. Com a planilha do RAG sendo atualizada constantemente, os termos de classificação precisam evoluir automaticamente junto com o conteúdo, sem intervenção técnica.

---

## Solução

O node `Classificar RAG` passa a extrair os termos diretamente da coluna **Pergunta** da planilha Google Sheets (base de conhecimento do RAG), com cache no Redis para evitar latência. Quanto mais a planilha for enriquecida, mais assertivo o classificador fica — automaticamente.

---

## Arquitetura

```
Mensagem chega
      ↓
[Classificar RAG] — node Code JS único
      ↓
1. Busca "rag:termos" no Redis
   ├── HIT  → usa lista do cache
   └── MISS →
       ├── Chama Google Sheets API (coluna Pergunta)
       │   ├── OK  → extrai termos
       │   │       → salva "rag:termos" (TTL 5min)
       │   │       → salva "rag:termos:backup" (sem TTL)
       │   │       → usa lista
       │   └── FAIL → busca "rag:termos:backup"
       │               ├── existe → usa backup (dados antigos, melhor que nada)
       │               └── vazio  → usa regex hardcoded (fallback final)
      ↓
2. Verifica se algum termo está na mensagem_original
      ↓
Injeta usar_rag: true/false no JSON
```

**Nada mais muda:** conexões, posição do node, IF RAG?, e todos os outros nodes permanecem intactos.

---

## Redis

| Chave | Valor | TTL |
|---|---|---|
| `rag:termos` | Array JSON de strings | 300s (5 minutos) |
| `rag:termos:backup` | Array JSON de strings | Sem TTL (permanente) |

**Por que 5 minutos:** a planilha é atualizada constantemente. 5 minutos garante que novos termos entram em vigor rapidamente sem sobrecarregar o Sheets (máximo ~12 chamadas/hora).

**Por que backup sem TTL:** se o Sheets ficar fora do ar por horas ou dias, o atendimento nunca para. O backup usa os últimos termos válidos conhecidos.

---

## Google Sheets — Extração de Termos

**Fonte:** coluna "Pergunta" da planilha base do RAG  
**Método:** regex que extrai palavras com 4+ letras, removendo stopwords

**Stopwords ignoradas:**
```
qual, quais, voce, voces, tem, para, como, hoje, isso, esse, essa, 
mais, muito, quero, saber, quer, pode, pode, fazer, feito, seria,
dias, horas, uma, uns, umas, que, por, com, sem, seu, sua
```

**Exemplo de extração:**
```
Pergunta: "Qual o horário de funcionamento?"
Termos:   ["horário", "funcionamento"]

Pergunta: "Tem kit churrasco? Quais os kits disponíveis?"
Termos:   ["churrasco", "kits", "disponíveis"]

Pergunta: "Quais as ofertas da semana? Tem promoção?"
Termos:   ["ofertas", "semana", "promoção"]
```

Os termos são normalizados para minúsculo antes de salvar no cache.

---

## Classificação

A mensagem do cliente é verificada contra cada termo via `includes()`:

```javascript
const usar_rag = termos.some(termo => msg.includes(termo));
```

Simples, rápido, sem regex complexo na classificação em si.

---

## Fallback Final (Regex Hardcoded)

Usado apenas se Redis e Sheets falharem simultaneamente e não houver backup:

```
/ofer[ta]|promoc|promoç|promo\b|descont|liquidac|liquidaç|saldao|saldão|
queima.*estoque|mais.*barat|baratinho|precinho|black.*friday|\bblack\b|
cupom|frete.*grat|entreg|delivery|motoboy|hor[aá]rio|funcionamento|
endere[cç]o|onde.*fica|telefone|whatsapp|contato|\bkit\b|kits|churrasco|
disponiv|semana/i
```

Cenário extremamente raro — apenas quando toda a infraestrutura falha ao mesmo tempo.

---

## Credenciais necessárias

- **Google Sheets API:** credencial OAuth2 ou Service Account já configurada no n8n (a mesma usada pelo Agente RAG/Treinamento)
- **Redis:** credencial já existente no fluxo (nodes Redis4 e Redis5)
- **ID da planilha + nome da aba:** a ser confirmado na implementação

---

## O que evolui automaticamente

Toda vez que uma nova pergunta é adicionada à planilha:
1. Em até 5 minutos o cache expira
2. O fluxo busca a planilha atualizada
3. Extrai os novos termos
4. O classificador já cobre os novos casos

Zero intervenção técnica necessária.

---

## O que NÃO muda

- Posição e conexões do node `Classificar RAG`
- Condição do `IF RAG?`
- Nodes de memória Redis4 e Redis5
- Agente principal e contexto
- Qualquer outro node do fluxo
