-- 1) Corrigir dados: ofertas importadas pela planilha ficaram com tipo='produto'
--    e por isso não apareciam na página Ofertas e Kits (que filtra tipo IN ('oferta','kit')).
UPDATE produtos SET tipo = 'oferta' WHERE categoria ILIKE 'ofertas' AND tipo = 'produto';

-- Normalizar categoria 'Kits' -> 'kits' (havia registros com capitalização mista)
UPDATE produtos SET categoria = 'kits' WHERE categoria = 'Kits';

-- 2) Recriar match_produtos sem estoque_atual/disponivel.
--    A assinatura de retorno muda, então é preciso DROP antes (CREATE OR REPLACE não
--    permite alterar RETURNS TABLE). Usada pelo Fluxo 8 (busca semântica n8n).
DROP FUNCTION IF EXISTS match_produtos(vector, integer, double precision);

CREATE FUNCTION match_produtos(
  query_embedding vector,
  match_count integer DEFAULT 5,
  match_threshold double precision DEFAULT 0.3
)
RETURNS TABLE(
  id uuid,
  nome text,
  preco_atual numeric,
  unidade text,
  categoria text,
  similarity double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.nome,
    p.preco_atual,
    p.unidade,
    p.categoria,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM produtos p
  WHERE
    p.ativo = true
    AND p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> query_embedding) > match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 3) Remover colunas não usadas. Disponibilidade agora é controlada apenas por "ativo".
ALTER TABLE produtos DROP COLUMN IF EXISTS estoque_atual;
ALTER TABLE produtos DROP COLUMN IF EXISTS disponivel;
