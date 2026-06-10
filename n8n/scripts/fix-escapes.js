// Chave só via env (repo é público): defina N8N_API_KEY antes de rodar
const API_KEY = process.env.N8N_API_KEY;
if (!API_KEY) {
  console.error('Defina a variavel de ambiente N8N_API_KEY antes de rodar este script.');
  process.exit(1);
}
const wf = require('../../fluxo1_fix3.json');

// Código correto — sem template literals para evitar problemas de escape
const jsCodeSheets = [
  "const msg = ($('Detectar Endereco').item.json.mensagem_original || '').toLowerCase();",
  "",
  "const STOPWORDS = new Set([",
  "  'qual', 'quais', 'voce', 'voces', 'tem', 'para', 'como', 'hoje', 'isso',",
  "  'esse', 'essa', 'mais', 'muito', 'quero', 'saber', 'quer', 'pode', 'fazer',",
  "  'feito', 'seria', 'dias', 'horas', 'uma', 'uns', 'umas', 'que', 'por',",
  "  'com', 'sem', 'seu', 'sua', 'sao', 'estao', 'esta', 'este', 'aqui',",
  "  'tudo', 'nada', 'onde', 'quando', 'quem', 'tenho', 'temos', 'tenha',",
  "  'tinha', 'terei', 'teria', 'haver', 'tambem', 'ainda', 'sempre', 'nunca'",
  "]);",
  "",
  "function extrairTermos(sheetsData) {",
  "  const termos = new Set();",
  "  const values = sheetsData && sheetsData.values ? sheetsData.values : [];",
  "  for (const row of values) {",
  "    const pergunta = row[0];",
  "    if (!pergunta) continue;",
  "    const base = pergunta.toLowerCase();",
  "    const semAcento = base.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ');",
  "    const comAcento = base.replace(/[^a-z\\u00e0-\\u00fc0-9 ]/g, ' ');",
  "    semAcento.split(' ').filter(p => p.length >= 4 && !STOPWORDS.has(p)).forEach(p => termos.add(p));",
  "    comAcento.split(' ').filter(p => p.length >= 4 && !STOPWORDS.has(p.normalize('NFD').replace(/[\\u0300-\\u036f]/g,''))).forEach(p => termos.add(p));",
  "  }",
  "  return Array.from(termos);",
  "}",
  "",
  "const sheetsData = $input.item.json;",
  "const termos = extrairTermos(sheetsData);",
  "const usar_rag = termos.some(t => msg.includes(t));",
  "const termosJson = JSON.stringify(termos);",
  "const dadosOriginais = $('Detectar Endereco').item.json;",
  "",
  "return [{ json: { ...dadosOriginais, usar_rag, rag_fonte: 'sheets', rag_termos_novo: termosJson } }];"
].join('\n');

const jsCodeCache = [
  "const dadosOriginais = $('Detectar Endereco').item.json;",
  "const msg = (dadosOriginais.mensagem_original || '').toLowerCase();",
  "const cacheRaw = $input.item.json.propertyName;",
  "const termos = JSON.parse(cacheRaw);",
  "const usar_rag = termos.some(t => msg.includes(t));",
  "return [{ json: { ...dadosOriginais, usar_rag, rag_fonte: 'cache' } }];"
].join('\n');

// Verificar localmente que os termos são extraídos corretamente
const sheetsSimulado = {
  values: [
    ["Qual o horário de funcionamento?"],
    ["Vocês entregam?"],
    ["Quais as ofertas da semana? Tem promocao? Tem desconto?"],
    ["Tem kit churrasco? Quais os kits disponiveis?"]
  ]
};

function extrairTermosLocal(sheetsData) {
  const STOP = new Set(['qual','quais','voce','voces','tem','para','como','hoje','isso','esse','essa','mais','muito','quero','saber','quer','pode','fazer','feito','seria','dias','horas','uma','uns','umas','que','por','com','sem','seu','sua','sao','estao','esta','este','aqui','tudo','nada','onde','quando','quem','tenho','temos','tenha','tinha','terei','teria','haver','tambem','ainda','sempre','nunca']);
  const termos = new Set();
  const values = sheetsData && sheetsData.values ? sheetsData.values : [];
  for (const row of values) {
    const pergunta = row[0];
    if (!pergunta) continue;
    const base = pergunta.toLowerCase();
    // versão sem acento (cobre clientes que não usam acento)
    const semAcento = base.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ');
    // versão com acento (cobre termos como "horário", "promoção")
    const comAcento = base.replace(/[^a-zà-ü0-9 ]/g, ' ');
    semAcento.split(' ').filter(p => p.length >= 4 && !STOP.has(p)).forEach(p => termos.add(p));
    comAcento.split(' ').filter(p => p.length >= 4 && !STOP.has(p.normalize('NFD').replace(/[̀-ͯ]/g,''))).forEach(p => termos.add(p));
  }
  return Array.from(termos);
}

const termos = extrairTermosLocal(sheetsSimulado);
console.log('Termos extraídos:', termos);

const testes = [
  { msg: "boa tarde queria saber as ofertas de hoje?", esperado: true },
  { msg: "tem desconto pra mim?", esperado: true },
  { msg: "qual o horário de vocês?", esperado: true },
  { msg: "vocês entregam?", esperado: true },
  { msg: "tem kit churrasco?", esperado: true },
  { msg: "quero fazer um pedido", esperado: false },
  { msg: "oi tudo bem?", esperado: false },
];

let ok = 0;
testes.forEach(({ msg, esperado }) => {
  const resultado = termos.some(t => msg.includes(t));
  const pass = resultado === esperado;
  if (pass) ok++;
  console.log(pass ? 'OK' : 'FALHOU', `"${msg}" → ${resultado}`);
});
console.log(`\n${ok}/${testes.length} passaram`);

if (ok < testes.length) {
  console.error('Testes falharam — não fazendo deploy');
  process.exit(1);
}

// Deploy
const nodeSheets = wf.nodes.find(n => n.id === 'classificar-rag-sheets');
nodeSheets.parameters.jsCode = jsCodeSheets;

const nodeCache = wf.nodes.find(n => n.id === 'classificar-rag-cache');
nodeCache.parameters.jsCode = jsCodeCache;

async function deploy() {
  const put = await fetch('https://apps-n8n-start.ugykfn.easypanel.host/api/v1/workflows/OM5p23yhXYNjCVxQ', {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: { executionOrder: 'v1' } })
  });
  const r = await put.json();
  console.log(r.id ? '\nDeploy OK: ' + r.id : '\nErro: ' + JSON.stringify(r).slice(0, 200));
}
deploy().catch(console.error);
