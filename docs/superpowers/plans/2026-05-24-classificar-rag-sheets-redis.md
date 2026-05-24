# Classificador RAG — Google Sheets + Cache Redis

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o regex hardcoded do node `Classificar RAG` por uma lista de termos extraída dinamicamente da coluna "Pergunta" do Google Sheets, com cache Redis de 5 minutos e fallback em camadas.

**Architecture:** O node `Classificar RAG` (Code JS) passa a consultar o Redis antes de qualquer coisa. Em cache miss, chama a API do Google Sheets, extrai termos via regex das perguntas cadastradas, salva no Redis com TTL 5min + backup permanente. Em falha do Sheets, usa backup Redis ou regex hardcoded como último recurso. Apenas o código interno do node muda — conexões e fluxo intactos.

**Tech Stack:** n8n Code node (JavaScript), Redis (credencial "Redis Easypanel"), Google Sheets API v4 (credencial "Google Sheets account"), HTTP Request node interno via `$helpers` / fetch nativo do n8n.

---

## Credenciais confirmadas

| Serviço | ID da credencial | Nome |
|---|---|---|
| Redis | `8VYS9hIp0JjyoIgW` | Redis Easypanel |
| Google Sheets | `daxwYmJranwhukfj` | Google Sheets account |

## Dados da planilha

| Campo | Valor |
|---|---|
| ID da planilha | `1GvccHGwmKdldcj0FoIldjxrhE-O0nJcENaWg_BmfX_g` |
| Aba | `Master` |
| Coluna de perguntas | `A` (coluna "Pergunta") |

## Chaves Redis

| Chave | TTL | Uso |
|---|---|---|
| `rag:termos` | 300s (5min) | Cache principal |
| `rag:termos:backup` | Sem TTL | Fallback quando Sheets falha |

---

### Task 1: Preparar e testar a lógica de extração de termos localmente

**Contexto:** Antes de subir para o n8n, validar que o regex de extração produz os termos corretos a partir das perguntas reais da planilha.

**Files:**
- Create: `n8n/scripts/testar-extracao-termos.js`

- [ ] **Step 1: Criar script de teste local**

Crie o arquivo `n8n/scripts/testar-extracao-termos.js` com o conteúdo:

```javascript
// Simula as perguntas que existem na planilha Master
const perguntasSimuladas = [
  "Qual o horário de funcionamento?",
  "Vocês entregam?",
  "Quais as ofertas da semana? Tem promocao? Tem desconto? O quem tem de promoção hoje?",
  "Tem kit churrasco? Quais os kits disponiveis? Eu queria os kits que estão em oferta, quais são?"
];

const STOPWORDS = new Set([
  'qual', 'quais', 'voce', 'voces', 'tem', 'para', 'como', 'hoje', 'isso',
  'esse', 'essa', 'mais', 'muito', 'quero', 'saber', 'quer', 'pode', 'fazer',
  'feito', 'seria', 'dias', 'horas', 'uma', 'uns', 'umas', 'que', 'por',
  'com', 'sem', 'seu', 'sua', 'são', 'estao', 'esta', 'este', 'aqui',
  'tudo', 'nada', 'onde', 'quando', 'quem', 'cujo', 'cujos', 'cujas',
  'vocês', 'então', 'entao', 'também', 'tambem', 'ainda', 'sempre',
  'nunca', 'talvez', 'seria', 'seria', 'seria', 'seria', 'haver',
  'tenho', 'temos', 'tenha', 'tinha', 'tinha', 'terei', 'teria'
]);

function extrairTermos(perguntas) {
  const termos = new Set();
  for (const pergunta of perguntas) {
    const palavras = pergunta
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // remove acentos para comparar stopwords
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(p => p.length >= 4 && !STOPWORDS.has(p));
    palavras.forEach(p => {
      // Salva versão original (com acento) para busca mais precisa
      const original = pergunta
        .toLowerCase()
        .replace(/[^a-záéíóúâêîôûãõçàèìòùäëïöü0-9\s]/g, ' ')
        .split(/\s+/)
        .find(w => w.normalize('NFD').replace(/[̀-ͯ]/g, '') === p);
      if (original) termos.add(original);
    });
  }
  return Array.from(termos).sort();
}

const termos = extrairTermos(perguntasSimuladas);
console.log('Termos extraídos:', termos);
console.log('Total:', termos.length);

// Testar classificação
const mensagensTeste = [
  { msg: "Boa tarde queria saber as ofertas de hoje?", esperado: true },
  { msg: "tem desconto pra mim?", esperado: true },
  { msg: "qual o horário de vocês?", esperado: true },
  { msg: "vocês entregam?", esperado: true },
  { msg: "tem kit churrasco?", esperado: true },
  { msg: "quero fazer um pedido", esperado: false },
  { msg: "oi tudo bem?", esperado: false },
];

console.log('\nTestes de classificação:');
let passou = 0;
for (const { msg, esperado } of mensagensTeste) {
  const msgNorm = msg.toLowerCase();
  const resultado = termos.some(t => msgNorm.includes(t));
  const ok = resultado === esperado;
  if (ok) passou++;
  console.log(`${ok ? '✓' : '✗'} "${msg}" → usar_rag: ${resultado} (esperado: ${esperado})`);
}
console.log(`\n${passou}/${mensagensTeste.length} testes passaram`);
```

- [ ] **Step 2: Executar o script**

```bash
node n8n/scripts/testar-extracao-termos.js
```

Resultado esperado:
```
Termos extraídos: ['churrasco', 'desconto', 'disponiveis', 'entregam', 'funcionamento', 'horário', 'kits', 'oferta', 'ofertas', 'promocao', 'promoção', 'semana']
Total: 12

Testes de classificação:
✓ "Boa tarde queria saber as ofertas de hoje?" → usar_rag: true (esperado: true)
✓ "tem desconto pra mim?" → usar_rag: true (esperado: true)
✓ "qual o horário de vocês?" → usar_rag: true (esperado: true)
✓ "vocês entregam?" → usar_rag: true (esperado: true)
✓ "tem kit churrasco?" → usar_rag: true (esperado: true)
✓ "quero fazer um pedido" → usar_rag: false (esperado: false)
✓ "oi tudo bem?" → usar_rag: false (esperado: false)

7/7 testes passaram
```

Se algum teste falhar, ajuste as stopwords ou o comprimento mínimo de palavra (atualmente 4) no script antes de prosseguir.

- [ ] **Step 3: Commitar o script**

```bash
git add n8n/scripts/testar-extracao-termos.js
git commit -m "test: script de validação da extração de termos RAG do Sheets"
```

---

### Task 2: Montar e validar o código completo do node `Classificar RAG`

**Contexto:** O node Code do n8n não tem acesso direto ao Redis ou ao Sheets via SDK — ele usa `$helpers` para HTTP e as credenciais são injetadas via `$credentials`. Porém o node é do tipo `code` simples, não `httpRequest`. A solução é usar o `$node` context para chamar APIs via `fetch` nativo disponível no ambiente n8n (Node.js 18+).

**Importante:** O acesso ao Redis no n8n Code node é feito via HTTP para a API do Redis (se exposta) ou via um workaround. Na prática, o n8n não expõe Redis diretamente em nodes Code. A solução correta é usar **dois nodes HTTP Request** para Redis GET/SET, ou usar o **módulo ioredis via require** se disponível.

Verificar primeiro qual abordagem funciona no ambiente:

- [ ] **Step 1: Verificar se `require('ioredis')` está disponível no n8n**

No n8n, abra qualquer node Code existente no fluxo e execute:

```javascript
try {
  const Redis = require('ioredis');
  return [{ json: { disponivel: true } }];
} catch(e) {
  return [{ json: { disponivel: false, erro: e.message } }];
}
```

**Se `disponivel: true`:** usar ioredis diretamente no node Code (Opção A — mais simples).  
**Se `disponivel: false`:** usar nodes HTTP Request separados para Redis (Opção B — mais nodes no canvas).

- [ ] **Step 2a (se ioredis disponível): Montar código completo**

Crie o arquivo `n8n/scripts/classificar-rag-code.js` com o código a ser colado no node:

```javascript
const Redis = require('ioredis');
const https = require('https');

// ── Configuração ──────────────────────────────────────────────
const SHEETS_ID = '1GvccHGwmKdldcj0FoIldjxrhE-O0nJcENaWg_BmfX_g';
const SHEETS_ABA = 'Master';
const REDIS_KEY = 'rag:termos';
const REDIS_BACKUP_KEY = 'rag:termos:backup';
const REDIS_TTL = 300; // 5 minutos

// Regex hardcoded como fallback final
const REGEX_FALLBACK = /ofer[ta]|promoc|promoç|promo\b|descont|liquidac|liquidaç|saldao|saldão|queima.*estoque|mais.*barat|baratinho|precinho|black.*friday|\bblack\b|cupom|frete.*grat|entreg|delivery|motoboy|hor[aá]rio|funcionamento|endere[cç]o|onde.*fica|telefone|whatsapp|contato|\bkit\b|kits|churrasco|disponiv|semana/i;

// ── Stopwords ─────────────────────────────────────────────────
const STOPWORDS = new Set([
  'qual', 'quais', 'voce', 'voces', 'tem', 'para', 'como', 'hoje', 'isso',
  'esse', 'essa', 'mais', 'muito', 'quero', 'saber', 'quer', 'pode', 'fazer',
  'feito', 'seria', 'dias', 'horas', 'uma', 'uns', 'umas', 'que', 'por',
  'com', 'sem', 'seu', 'sua', 'sao', 'estao', 'esta', 'este', 'aqui',
  'tudo', 'nada', 'onde', 'quando', 'quem', 'tenho', 'temos', 'tenha',
  'tinha', 'terei', 'teria', 'haver', 'tambem', 'ainda', 'sempre', 'nunca'
]);

// ── Extração de termos das perguntas ──────────────────────────
function extrairTermos(perguntas) {
  const termos = new Set();
  for (const pergunta of perguntas) {
    if (!pergunta) continue;
    const semAcento = pergunta.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ');
    const comAcento = pergunta.toLowerCase()
      .replace(/[^a-záéíóúâêîôûãõçàèìòùäëïöü0-9\s]/g, ' ');
    const palavrasSemAcento = semAcento.split(/\s+/);
    const palavrasComAcento = comAcento.split(/\s+/);
    palavrasSemAcento.forEach((p, i) => {
      if (p.length >= 4 && !STOPWORDS.has(p)) {
        const original = palavrasComAcento[i] || p;
        if (original.length >= 4) termos.add(original);
      }
    });
  }
  return Array.from(termos);
}

// ── Busca termos no Sheets via token OAuth ────────────────────
async function buscarTermosSheets(token) {
  const range = encodeURIComponent(`${SHEETS_ABA}!A2:A1000`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/${range}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Sheets HTTP ${res.status}`);
  const data = await res.json();
  const perguntas = (data.values || []).map(row => row[0]).filter(Boolean);
  return extrairTermos(perguntas);
}

// ── Main ──────────────────────────────────────────────────────
const msg = ($input.item.json.mensagem_original || '').toLowerCase();
const token = $credentials.googleSheetsOAuth2Api?.access_token;

// Conexão Redis
const redisUrl = $credentials.redis?.url || 'redis://localhost:6379';
const redis = new Redis(redisUrl);

let termos = null;
let fonte = '';

try {
  // 1. Tentar cache Redis
  const cached = await redis.get(REDIS_KEY);
  if (cached) {
    termos = JSON.parse(cached);
    fonte = 'cache';
  } else {
    // 2. Cache miss — buscar Sheets
    try {
      termos = await buscarTermosSheets(token);
      await redis.set(REDIS_KEY, JSON.stringify(termos), 'EX', REDIS_TTL);
      await redis.set(REDIS_BACKUP_KEY, JSON.stringify(termos));
      fonte = 'sheets';
    } catch (sheetsErr) {
      // 3. Sheets falhou — tentar backup Redis
      const backup = await redis.get(REDIS_BACKUP_KEY);
      if (backup) {
        termos = JSON.parse(backup);
        fonte = 'backup';
      } else {
        // 4. Fallback final — regex hardcoded
        const usar_rag = REGEX_FALLBACK.test(msg);
        await redis.quit();
        return [{ json: { ...$input.item.json, usar_rag, rag_fonte: 'fallback_regex' } }];
      }
    }
  }
} finally {
  await redis.quit();
}

// Classificar mensagem contra lista de termos
const usar_rag = termos.some(t => msg.includes(t));

return [{ json: { ...$input.item.json, usar_rag, rag_fonte: fonte } }];
```

- [ ] **Step 2b (se ioredis NÃO disponível): reportar ao usuário**

Se `ioredis` não estiver disponível, o código precisa de ajuste arquitetural. Pare aqui e consulte o usuário sobre adicionar nodes HTTP Request para Redis no canvas antes de continuar.

- [ ] **Step 3: Validar sintaxe do código localmente**

```bash
node --check n8n/scripts/classificar-rag-code.js
```

Resultado esperado: nenhum erro de sintaxe (o comando retorna sem output).

- [ ] **Step 4: Commitar o código**

```bash
git add n8n/scripts/classificar-rag-code.js
git commit -m "feat: código do node Classificar RAG com Sheets + Redis"
```

---

### Task 3: Atualizar o node `Classificar RAG` no n8n via API

**Contexto:** Substituir o `jsCode` do node `classificar-rag` no workflow `OM5p23yhXYNjCVxQ`. Apenas o campo `jsCode` muda — tudo mais permanece igual.

- [ ] **Step 1: Criar script de deploy**

Crie `n8n/scripts/deploy-classificar-rag.js`:

```javascript
const fs = require('fs');
const https = require('https');

const N8N_URL = 'https://apps-n8n-start.ugykfn.easypanel.host';
const WORKFLOW_ID = 'OM5p23yhXYNjCVxQ';
const API_KEY = process.env.N8N_API_KEY;

if (!API_KEY) {
  console.error('Defina N8N_API_KEY antes de rodar');
  process.exit(1);
}

const jsCode = fs.readFileSync('./n8n/scripts/classificar-rag-code.js', 'utf8');

async function deploy() {
  // Buscar workflow atual
  const res = await fetch(`${N8N_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
    headers: { 'X-N8N-API-KEY': API_KEY }
  });
  const wf = await res.json();

  // Atualizar apenas o jsCode do node classificar-rag
  const node = wf.nodes.find(n => n.id === 'classificar-rag');
  if (!node) throw new Error('Node classificar-rag não encontrado!');
  node.parameters.jsCode = jsCode;

  // Enviar de volta
  const put = await fetch(`${N8N_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
    method: 'PUT',
    headers: {
      'X-N8N-API-KEY': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: { executionOrder: 'v1' }
    })
  });
  const result = await put.json();
  if (result.id) {
    console.log('Deploy OK — workflow ID:', result.id);
  } else {
    console.error('Erro:', JSON.stringify(result));
  }
}

deploy().catch(console.error);
```

- [ ] **Step 2: Executar o deploy**

```bash
N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5NjIzYTIxNi01NTdkLTRiMTgtYjllNC1kYzA3NmVhN2Y1MDMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMjVlNjlhZjMtNzAwNC00MGIzLThlOWYtMWFlOGEzY2FhNjNlIiwiaWF0IjoxNzc4NTQyNTQ1fQ.jfnAW-6B1JQJ2krGT1PVIjFc80dP3nh1aAVGDubnK8U node n8n/scripts/deploy-classificar-rag.js
```

Resultado esperado:
```
Deploy OK — workflow ID: OM5p23yhXYNjCVxQ
```

- [ ] **Step 3: Verificar o node no n8n**

Abra o Fluxo 1 no n8n e clique no node `Classificar RAG`. Confirme que o código JS foi atualizado — deve começar com:
```javascript
const Redis = require('ioredis');
```

- [ ] **Step 4: Commitar scripts de deploy**

```bash
git add n8n/scripts/deploy-classificar-rag.js
git commit -m "feat: script de deploy do Classificar RAG com Sheets + Redis"
```

---

### Task 4: Teste de ponta a ponta no n8n

**Contexto:** Verificar que o fluxo completo funciona corretamente com a nova lógica — cache miss na primeira execução, cache hit na segunda, e roteamento correto.

- [ ] **Step 1: Primeiro teste — cache miss (primeira execução)**

Envie via WhatsApp de teste ou dispare manualmente no n8n:
```
"Boa tarde queria saber as ofertas de hoje?"
```

Nos logs de execução do n8n, verifique o output do node `Classificar RAG`:
```json
{
  "usar_rag": true,
  "rag_fonte": "sheets"
}
```
E que o `IF RAG?` roteou para a **True Branch**.

- [ ] **Step 2: Segundo teste — cache hit**

Envie imediatamente (dentro de 5 minutos):
```
"tem desconto pra mim?"
```

Output esperado do `Classificar RAG`:
```json
{
  "usar_rag": true,
  "rag_fonte": "cache"
}
```

- [ ] **Step 3: Teste de não-RAG**

Envie:
```
"quero fazer um pedido"
```

Output esperado:
```json
{
  "usar_rag": false,
  "rag_fonte": "cache"
}
```
E que o `IF RAG?` roteou para a **False Branch**.

- [ ] **Step 4: Teste de entrega e kit**

Envie:
```
"vocês entregam?"
```
Esperado: `usar_rag: true` → True Branch.

```
"tem kit churrasco?"
```
Esperado: `usar_rag: true` → True Branch.

- [ ] **Step 5: Testar enriquecimento da planilha**

Adicione uma nova linha na aba **Master** da planilha com a pergunta:
```
Aceita cartão de crédito?
```

Aguarde 5 minutos (TTL do cache expirar) e envie:
```
"aceita cartão?"
```

Esperado: `usar_rag: true` → o termo "aceita" ou "cartao" foi extraído automaticamente da nova pergunta.

---

## Checklist final

- [ ] Script de extração local valida 7/7 testes
- [ ] `ioredis` confirmado disponível no n8n
- [ ] Código do node sem erros de sintaxe
- [ ] Deploy executado com sucesso (ID: OM5p23yhXYNjCVxQ)
- [ ] Primeiro teste mostra `rag_fonte: "sheets"`
- [ ] Segundo teste mostra `rag_fonte: "cache"`
- [ ] Mensagens não-RAG vão para False Branch
- [ ] Novo termo da planilha é detectado após 5 minutos
- [ ] Fluxo salvo no n8n
