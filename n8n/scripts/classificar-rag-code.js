// Node: Classificar RAG
// Recebe o cache Redis em $json.rag_cache (string JSON ou null)
// Se cache existe: usa direto
// Se não: busca Google Sheets, extrai termos, sinaliza para salvar no Redis
// Output: { ...campos_anteriores, usar_rag, rag_fonte, rag_termos_novo (se buscou Sheets) }

const SHEETS_ID = '1GvccHGwmKdldcj0FoIldjxrhE-O0nJcENaWg_BmfX_g';
const SHEETS_ABA = 'Master';

const REGEX_FALLBACK = /ofer[ta]|promoc|promoç|promo\b|descont|liquidac|liquidaç|saldao|saldão|queima.*estoque|mais.*barat|baratinho|precinho|black.*friday|\bblack\b|cupom|frete.*grat|entreg|delivery|motoboy|hor[aá]rio|funcionamento|endere[cç]o|onde.*fica|telefone|whatsapp|contato|\bkit\b|kits|churrasco|disponiv|semana/i;

const STOPWORDS = new Set([
  'qual', 'quais', 'voce', 'voces', 'tem', 'para', 'como', 'hoje', 'isso',
  'esse', 'essa', 'mais', 'muito', 'quero', 'saber', 'quer', 'pode', 'fazer',
  'feito', 'seria', 'dias', 'horas', 'uma', 'uns', 'umas', 'que', 'por',
  'com', 'sem', 'seu', 'sua', 'sao', 'estao', 'esta', 'este', 'aqui',
  'tudo', 'nada', 'onde', 'quando', 'quem', 'tenho', 'temos', 'tenha',
  'tinha', 'terei', 'teria', 'haver', 'tambem', 'ainda', 'sempre', 'nunca'
]);

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
        termos.add(p); // versão sem acento para clientes que não usam acento
      }
    });
  }
  return Array.from(termos);
}

async function buscarTermosSheets() {
  const range = encodeURIComponent(`${SHEETS_ABA}!A2:A1000`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/${range}`;
  const token = $credentials?.googleSheetsOAuth2Api?.access_token;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Sheets HTTP ${res.status}`);
  const data = await res.json();
  const perguntas = (data.values || []).map(row => row[0]).filter(Boolean);
  return extrairTermos(perguntas);
}

const msg = ($input.item.json.mensagem_original || '').toLowerCase();
const cacheRaw = $input.item.json.rag_cache;

let termos = null;
let fonte = '';
let termosNovo = null;

if (cacheRaw) {
  // Cache hit — usa direto
  try {
    termos = JSON.parse(cacheRaw);
    fonte = 'cache';
  } catch {
    termos = null;
  }
}

if (!termos) {
  // Cache miss — buscar Sheets
  try {
    termos = await buscarTermosSheets();
    fonte = 'sheets';
    termosNovo = JSON.stringify(termos); // sinaliza para o Redis SET salvar
  } catch (sheetsErr) {
    // Sheets falhou — fallback regex hardcoded
    const usar_rag = REGEX_FALLBACK.test(msg);
    return [{ json: { ...$input.item.json, usar_rag, rag_fonte: 'fallback_regex', rag_cache: undefined } }];
  }
}

const usar_rag = termos.some(t => msg.includes(t));

return [{ json: { ...$input.item.json, usar_rag, rag_fonte: fonte, rag_termos_novo: termosNovo } }];
