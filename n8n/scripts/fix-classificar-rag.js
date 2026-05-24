const fs = require('fs');

const N8N_URL = 'https://apps-n8n-start.ugykfn.easypanel.host';
const WORKFLOW_ID = 'OM5p23yhXYNjCVxQ';
const API_KEY = process.env.N8N_API_KEY;
const REDIS_CRED_ID = '8VYS9hIp0JjyoIgW';
const REDIS_CRED_NAME = 'Redis Easypanel';
const SHEETS_CRED_ID = 'daxwYmJranwhukfj';
const SHEETS_CRED_NAME = 'Google Sheets account';
const SHEETS_ID = '1GvccHGwmKdldcj0FoIldjxrhE-O0nJcENaWg_BmfX_g';
const SHEETS_ABA = 'Master';

if (!API_KEY) { console.error('Defina N8N_API_KEY'); process.exit(1); }

// Código do Classificar RAG — recebe cache OU dados do Sheets já prontos
const jsCodeComCache = `
const msg = ($input.item.json.mensagem_original || '').toLowerCase();
const cacheRaw = $input.item.json.propertyName;

const STOPWORDS = new Set([
  'qual', 'quais', 'voce', 'voces', 'tem', 'para', 'como', 'hoje', 'isso',
  'esse', 'essa', 'mais', 'muito', 'quero', 'saber', 'quer', 'pode', 'fazer',
  'feito', 'seria', 'dias', 'horas', 'uma', 'uns', 'umas', 'que', 'por',
  'com', 'sem', 'seu', 'sua', 'sao', 'estao', 'esta', 'este', 'aqui',
  'tudo', 'nada', 'onde', 'quando', 'quem', 'tenho', 'temos', 'tenha',
  'tinha', 'terei', 'teria', 'haver', 'tambem', 'ainda', 'sempre', 'nunca'
]);

const termos = JSON.parse(cacheRaw);
const usar_rag = termos.some(t => msg.includes(t));
return [{ json: { ...$input.item.json, usar_rag, rag_fonte: 'cache' } }];
`.trim();

const jsCodeSemCache = `
const msg = ($input.item.json.mensagem_original || '').toLowerCase();

const STOPWORDS = new Set([
  'qual', 'quais', 'voce', 'voces', 'tem', 'para', 'como', 'hoje', 'isso',
  'esse', 'essa', 'mais', 'muito', 'quero', 'saber', 'quer', 'pode', 'fazer',
  'feito', 'seria', 'dias', 'horas', 'uma', 'uns', 'umas', 'que', 'por',
  'com', 'sem', 'seu', 'sua', 'sao', 'estao', 'esta', 'este', 'aqui',
  'tudo', 'nada', 'onde', 'quando', 'quem', 'tenho', 'temos', 'tenha',
  'tinha', 'terei', 'teria', 'haver', 'tambem', 'ainda', 'sempre', 'nunca'
]);

function extrairTermos(sheetsData) {
  const termos = new Set();
  const values = sheetsData?.values || [];
  for (const row of values) {
    const pergunta = row[0];
    if (!pergunta) continue;
    const semAcento = pergunta.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\\s]/g, ' ');
    const comAcento = pergunta.toLowerCase()
      .replace(/[^a-záéíóúâêîôûãõçàèìòùäëïöü0-9\\s]/g, ' ');
    const palavrasSemAcento = semAcento.split(/\\s+/);
    const palavrasComAcento = comAcento.split(/\\s+/);
    palavrasSemAcento.forEach((p, i) => {
      if (p.length >= 4 && !STOPWORDS.has(p)) {
        const original = palavrasComAcento[i] || p;
        if (original.length >= 4) termos.add(original);
        termos.add(p);
      }
    });
  }
  return Array.from(termos);
}

const sheetsData = $input.item.json;
const termos = extrairTermos(sheetsData);
const usar_rag = termos.some(t => msg.includes(t));
const termosJson = JSON.stringify(termos);

return [{ json: { ...$input.item.json, usar_rag, rag_fonte: 'sheets', rag_termos_novo: termosJson } }];
`.trim();

async function deploy() {
  const wf = require('../../fluxo1_fix.json');

  // ── Remover nodes da tentativa anterior ──
  const remover = [
    'classificar-rag', 'redis-get-rag-termos', 'redis-set-rag-termos',
    'redis-set-rag-backup', 'if-novo-cache'
  ];
  wf.nodes = wf.nodes.filter(n => !remover.includes(n.id));
  delete wf.connections['Classificar RAG'];
  delete wf.connections['Redis GET rag:termos'];
  delete wf.connections['IF Novo Cache?'];
  delete wf.connections['Redis SET rag:termos'];
  delete wf.connections['Redis SET rag:termos:backup'];

  // ── Restaurar IF RAG? para posição original ──
  const ifRag = wf.nodes.find(n => n.id === 'if-rag-trigger');
  ifRag.position = [4720, 304];

  // ── Nova arquitetura ──────────────────────────────────────
  // Interceptar Endereco? False → Redis GET rag:termos
  wf.connections['Interceptar Endereco?'].main[1] = [
    { node: 'Redis GET rag:termos', type: 'main', index: 0 }
  ];

  // 1. Redis GET rag:termos (posição: 4336, 304)
  wf.nodes.push({
    parameters: { operation: 'get', key: 'rag:termos', keyType: 'string', options: {} },
    id: 'redis-get-rag-termos',
    name: 'Redis GET rag:termos',
    type: 'n8n-nodes-base.redis',
    typeVersion: 1,
    position: [4336, 304],
    credentials: { redis: { id: REDIS_CRED_ID, name: REDIS_CRED_NAME } }
  });

  // 2. IF Cache Existe? (posição: 4496, 304)
  wf.nodes.push({
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{
          id: 'check-cache-existe',
          leftValue: '={{ $json.propertyName }}',
          rightValue: '',
          operator: { type: 'string', operation: 'notEquals' }
        }],
        combinator: 'and'
      },
      options: {}
    },
    id: 'if-cache-existe',
    name: 'IF Cache Existe?',
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position: [4496, 304]
  });

  // 3. Classificar RAG com Cache (True Branch) — posição: 4656, 224
  wf.nodes.push({
    parameters: { jsCode: jsCodeComCache },
    id: 'classificar-rag-cache',
    name: 'Classificar RAG Cache',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [4656, 224]
  });

  // 4. HTTP Request Sheets (False Branch — cache miss) — posição: 4656, 400
  wf.nodes.push({
    parameters: {
      method: 'GET',
      url: `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/${encodeURIComponent(SHEETS_ABA + '!A2:A1000')}`,
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'googleSheetsOAuth2Api',
      options: {}
    },
    id: 'http-sheets-perguntas',
    name: 'HTTP Sheets Perguntas',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [4656, 400],
    credentials: {
      googleSheetsOAuth2Api: { id: SHEETS_CRED_ID, name: SHEETS_CRED_NAME }
    }
  });

  // 5. Classificar RAG do Sheets (após HTTP) — posição: 4816, 400
  wf.nodes.push({
    parameters: { jsCode: jsCodeSemCache },
    id: 'classificar-rag-sheets',
    name: 'Classificar RAG Sheets',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [4816, 400]
  });

  // 6. Redis SET rag:termos TTL 5min — posição: 4976, 400
  wf.nodes.push({
    parameters: {
      operation: 'set',
      key: 'rag:termos',
      keyType: 'string',
      value: '={{ $json.rag_termos_novo }}',
      expire: true,
      ttl: 300
    },
    id: 'redis-set-rag-termos',
    name: 'Redis SET rag:termos',
    type: 'n8n-nodes-base.redis',
    typeVersion: 1,
    position: [4976, 400],
    credentials: { redis: { id: REDIS_CRED_ID, name: REDIS_CRED_NAME } }
  });

  // 7. Redis SET rag:termos:backup sem TTL — posição: 4976, 560
  wf.nodes.push({
    parameters: {
      operation: 'set',
      key: 'rag:termos:backup',
      keyType: 'string',
      value: '={{ $json.rag_termos_novo }}',
      expire: false
    },
    id: 'redis-set-rag-backup',
    name: 'Redis SET rag:termos:backup',
    type: 'n8n-nodes-base.redis',
    typeVersion: 1,
    position: [4976, 560],
    credentials: { redis: { id: REDIS_CRED_ID, name: REDIS_CRED_NAME } }
  });

  // 8. Merge RAG inputs — posição: 4816, 224 (recebe cache e sheets)
  // IF RAG? vai receber de Classificar RAG Cache e de Classificar RAG Sheets via Merge
  // Vamos usar o Merge RAG já existente ou conectar direto ao IF RAG?
  // Para ser cirúrgico: conectar ambos diretamente ao IF RAG?
  ifRag.position = [4976, 224];

  // ── Conexões ──────────────────────────────────────────────
  wf.connections['Redis GET rag:termos'] = {
    main: [[{ node: 'IF Cache Existe?', type: 'main', index: 0 }]]
  };
  wf.connections['IF Cache Existe?'] = {
    main: [
      [{ node: 'Classificar RAG Cache', type: 'main', index: 0 }],  // True
      [{ node: 'HTTP Sheets Perguntas', type: 'main', index: 0 }]   // False
    ]
  };
  wf.connections['Classificar RAG Cache'] = {
    main: [[{ node: 'IF RAG?', type: 'main', index: 0 }]]
  };
  wf.connections['HTTP Sheets Perguntas'] = {
    main: [[{ node: 'Classificar RAG Sheets', type: 'main', index: 0 }]]
  };
  wf.connections['Classificar RAG Sheets'] = {
    main: [[
      { node: 'IF RAG?', type: 'main', index: 0 },
      { node: 'Redis SET rag:termos', type: 'main', index: 0 },
      { node: 'Redis SET rag:termos:backup', type: 'main', index: 0 }
    ]]
  };

  // ── Enviar ────────────────────────────────────────────────
  const put = await fetch(`${N8N_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
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
    console.error('Erro:', JSON.stringify(result).slice(0, 500));
  }
}

deploy().catch(console.error);
