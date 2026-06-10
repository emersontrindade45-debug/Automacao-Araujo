-- Busca híbrida no match_produtos (Fluxo 8 — busca semântica).
-- Problema: cliente digita "contrafilé" (junto) e o produto "Contra Filé" não vence
-- o ranking vetorial — itens semanticamente parecidos (Filé de Costela) vinham antes.
-- Solução: parâmetro opcional query_text; produtos com match textual normalizado
-- (sem acentos/espaços) vêm primeiro, e o ranking vetorial segue para os demais.
-- Compatível com a chamada antiga de 3 argumentos (query_text DEFAULT NULL).

CREATE OR REPLACE FUNCTION normalizar_busca(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(
    translate(
      lower(coalesce(txt, '')),
      'áàâãäéèêëíìîïóòôõöúùûüç',
      'aaaaaeeeeiiiiooooouuuuc'
    ),
    '[^a-z0-9]', '', 'g'
  );
$$;

-- Assinatura muda (novo param), exige DROP + CREATE. Transação única: atômico.
DROP FUNCTION IF EXISTS match_produtos(vector, integer, double precision);

CREATE FUNCTION match_produtos(
  query_embedding vector,
  match_count integer DEFAULT 5,
  match_threshold double precision DEFAULT 0.3,
  query_text text DEFAULT NULL
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
DECLARE
  q text := nullif(normalizar_busca(query_text), '');
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
    AND (
      1 - (p.embedding <=> query_embedding) > match_threshold
      OR (q IS NOT NULL AND normalizar_busca(p.nome) LIKE '%' || q || '%')
    )
  ORDER BY
    (q IS NOT NULL AND normalizar_busca(p.nome) LIKE '%' || q || '%') DESC,
    p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
