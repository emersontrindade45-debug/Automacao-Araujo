// Detecta mensagem de atualização de preço no formato:
// "preço [nome do produto] [valor]"
// Variações aceitas: "preco", "preço", "Preço", maiúsculas, vírgula decimal

const REGEX_PRECO = /^pre[çc]o\s+(.+?)\s+([\d]+[,.][\d]{1,2}|[\d]+)\s*$/i;

export interface PrecoDetectado {
  texto_produto: string;
  valor: number;
}

export function detectarAtualizacaoPreco(texto: string): PrecoDetectado | null {
  const match = texto.trim().match(REGEX_PRECO);
  if (!match) return null;

  const texto_produto = match[1].trim();
  const valorStr = match[2].replace(",", ".");
  const valor = parseFloat(valorStr);

  if (isNaN(valor) || valor <= 0) return null;

  return { texto_produto, valor };
}
