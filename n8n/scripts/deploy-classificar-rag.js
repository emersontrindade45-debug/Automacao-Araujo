const fs = require('fs');

const N8N_URL = 'https://apps-n8n-start.ugykfn.easypanel.host';
const WORKFLOW_ID = 'OM5p23yhXYNjCVxQ';
const API_KEY = process.env.N8N_API_KEY;
const REDIS_CRED_ID = '8VYS9hIp0JjyoIgW';
const REDIS_CRED_NAME = 'Redis Easypanel';
const SHEETS_CRED_ID = 'daxwYmJranwhukfj';
const SHEETS_CRED_NAME = 'Google Sheets account';

if (!API_KEY) { console.error('Defina N8N_API_KEY'); process.exit(1); }

const jsCode = fs.readFileSync('./n8n/scripts/classificar-rag-code.js', 'utf8');

async function deploy() {
  const res = await fetch(`${N8N_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
    headers: { 'X-N8N-API-KEY': API_KEY }
  });
  const wf = await res.json();

  // ── 1. Remover node Classificar RAG antigo e suas conexões ──
  wf.nodes = wf.nodes.filter(n => n.id !== 'classificar-rag');
  delete wf.connections['Classificar RAG'];

  // ── 2. Redirecionar Interceptar Endereco? False Branch para Redis GET ──
  wf.connections['Interceptar Endereco?'].main[1] = [
    { node: 'Redis GET rag:termos', type: 'main', index: 0 }
  ];

  // ── 3. Adicionar node Redis GET rag:termos ──
  wf.nodes.push({
    parameters: {
      operation: 'get',
      key: 'rag:termos',
      keyType: 'string',
      options: {}
    },
    id: 'redis-get-rag-termos',
    name: 'Redis GET rag:termos',
    type: 'n8n-nodes-base.redis',
    typeVersion: 1,
    position: [4464, 304],
    credentials: {
      redis: { id: REDIS_CRED_ID, name: REDIS_CRED_NAME }
    }
  });

  // ── 4. Adicionar node Classificar RAG (novo) ──
  wf.nodes.push({
    parameters: { jsCode },
    id: 'classificar-rag',
    name: 'Classificar RAG',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [4624, 304],
    credentials: {
      googleSheetsOAuth2Api: { id: SHEETS_CRED_ID, name: SHEETS_CRED_NAME }
    }
  });

  // ── 5. Adicionar node Redis SET rag:termos (só salva se buscou Sheets) ──
  wf.nodes.push({
    parameters: {
      operation: 'set',
      key: 'rag:termos',
      keyType: 'string',
      value: '={{ $json.rag_termos_novo }}',
      expire: true,
      ttl: 300,
      setValue: '={{ $json.rag_termos_novo != null }}'
    },
    id: 'redis-set-rag-termos',
    name: 'Redis SET rag:termos',
    type: 'n8n-nodes-base.redis',
    typeVersion: 1,
    position: [4784, 304],
    credentials: {
      redis: { id: REDIS_CRED_ID, name: REDIS_CRED_NAME }
    }
  });

  // ── 6. Adicionar node Redis SET rag:termos:backup (permanente) ──
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
    position: [4784, 464],
    credentials: {
      redis: { id: REDIS_CRED_ID, name: REDIS_CRED_NAME }
    }
  });

  // ── 7. Adicionar node IF Novo Cache? (só salva se rag_termos_novo != null) ──
  wf.nodes.push({
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{
          id: 'check-novo-cache',
          leftValue: '={{ $json.rag_termos_novo }}',
          rightValue: '',
          operator: { type: 'string', operation: 'notEquals' }
        }],
        combinator: 'and'
      },
      options: {}
    },
    id: 'if-novo-cache',
    name: 'IF Novo Cache?',
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position: [4624, 464]
  });

  // ── 8. Mover IF RAG? para nova posição ──
  const ifRag = wf.nodes.find(n => n.id === 'if-rag-trigger');
  ifRag.position = [4944, 304];

  // ── 9. Definir conexões dos novos nodes ──
  wf.connections['Redis GET rag:termos'] = {
    main: [[{ node: 'Classificar RAG', type: 'main', index: 0 }]]
  };

  wf.connections['Classificar RAG'] = {
    main: [
      [
        { node: 'IF RAG?', type: 'main', index: 0 },
        { node: 'IF Novo Cache?', type: 'main', index: 0 }
      ]
    ]
  };

  wf.connections['IF Novo Cache?'] = {
    main: [
      [
        { node: 'Redis SET rag:termos', type: 'main', index: 0 },
        { node: 'Redis SET rag:termos:backup', type: 'main', index: 0 }
      ],
      [] // False branch — não faz nada
    ]
  };

  // Redis SET não precisa de conexão de saída (fim do branch de cache)

  // ── 10. Enviar workflow atualizado ──
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
    console.log('Nodes adicionados: Redis GET rag:termos, Classificar RAG, IF Novo Cache?, Redis SET rag:termos, Redis SET rag:termos:backup');
  } else {
    console.error('Erro:', JSON.stringify(result).slice(0, 500));
  }
}

deploy().catch(console.error);
