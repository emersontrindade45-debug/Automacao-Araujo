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
  'com', 'sem', 'seu', 'sua', 'sao', 'estao', 'esta', 'este', 'aqui',
  'tudo', 'nada', 'onde', 'quando', 'quem', 'cujo', 'cujos', 'cujas',
  'voces', 'entao', 'tambem', 'ainda', 'sempre',
  'nunca', 'talvez', 'haver',
  'tenho', 'temos', 'tenha', 'tinha', 'terei', 'teria'
]);

function extrairTermos(perguntas) {
  const termos = new Set();
  for (const pergunta of perguntas) {
    const palavras = pergunta
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(p => p.length >= 4 && !STOPWORDS.has(p));
    palavras.forEach(p => {
      const original = pergunta
        .toLowerCase()
        .replace(/[^a-záéíóúâêîôûãõçàèìòùäëïöü0-9\s]/g, ' ')
        .split(/\s+/)
        .find(w => w.normalize('NFD').replace(/[̀-ͯ]/g, '') === p);
      if (original) termos.add(original);
      // também adiciona versão sem acento para cobrir digitação do cliente
      termos.add(p);
    });
  }
  return Array.from(termos).sort();
}

const termos = extrairTermos(perguntasSimuladas);
console.log('Termos extraídos:', termos);
console.log('Total:', termos.length);

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
  console.log(`${ok ? 'OK' : 'FALHOU'} "${msg}" -> usar_rag: ${resultado} (esperado: ${esperado})`);
}
console.log(`\n${passou}/${mensagensTeste.length} testes passaram`);
