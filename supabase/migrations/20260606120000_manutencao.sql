-- Tabela de erros capturados (n8n e Next.js)
create table manutencao_erros (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null check (source in ('n8n', 'nextjs')),
  workflow_name text,
  node_name text,
  route text,
  error_message text not null,
  error_stack text,
  context jsonb,
  status text not null default 'pendente' check (status in ('pendente', 'resolvido_ia', 'resolvido_dev', 'sem_solucao')),
  diagnostico_ia text,
  tentativas_ia jsonb default '[]',
  resolved_at timestamptz
);

-- Tabela de consumo de tokens OpenAI
create table manutencao_tokens (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null,
  model text not null,
  prompt_tokens int not null default 0,
  completion_tokens int not null default 0,
  total_tokens int not null default 0,
  custo_usd numeric(10, 6) not null default 0
);

-- RLS: apenas service_role acessa (rotas internas usam admin client)
alter table manutencao_erros enable row level security;
alter table manutencao_tokens enable row level security;

-- Índices para queries mais comuns
create index manutencao_erros_status_idx on manutencao_erros (status);
create index manutencao_erros_created_at_idx on manutencao_erros (created_at desc);
create index manutencao_tokens_created_at_idx on manutencao_tokens (created_at desc);
create index manutencao_tokens_source_idx on manutencao_tokens (source);
