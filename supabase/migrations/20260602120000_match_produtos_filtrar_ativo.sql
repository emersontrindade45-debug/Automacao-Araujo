-- Recria match_produtos filtrando apenas produtos ativos (ativo = true)
-- e inclui a coluna ativo no retorno para uso nos fluxos n8n.
--
-- IMPORTANTE: ajuste vector(1536) se usar modelo de embedding diferente
-- (text-embedding-3-small e text-embedding-ada-002 usam 1536 dimensões).

create or replace function match_produtos(
  query_embedding vector(1536),
  match_count     int     default 5,
  match_threshold float   default 0.3
)
returns table (
  id           uuid,
  nome         text,
  preco_atual  numeric,
  unidade      text,
  estoque_atual int,
  ativo        boolean,
  similarity   float
)
language plpgsql
as $$
begin
  return query
  select
    p.id,
    p.nome,
    p.preco_atual,
    p.unidade,
    p.estoque_atual,
    p.ativo,
    1 - (p.embedding <=> query_embedding) as similarity
  from produtos p
  where
    p.ativo = true
    and 1 - (p.embedding <=> query_embedding) > match_threshold
  order by p.embedding <=> query_embedding
  limit match_count;
end;
$$;
