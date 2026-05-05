-- Enum types
create type canal_origem as enum ('whatsapp', 'instagram', 'landpage');
create type etapa as enum (
  'novo', 'atendimento', 'fechamento', 'pedido_gerado',
  'separacao', 'em_rota', 'pos_venda', 'follow_up', 'marketing'
);
create type status_preco as enum ('pendente', 'aprovado', 'rejeitado');
create type papel as enum ('admin', 'atendimento', 'separacao', 'expedicao', 'followup');

-- Tabela de clientes
create table clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  canal_origem canal_origem not null,
  etapa_atual etapa not null default 'novo',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Tabela de produtos
create table produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  preco_atual numeric(10, 2) not null,
  unidade text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Tabela de pedidos
create table pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  itens jsonb not null default '[]',
  status etapa not null default 'pedido_gerado',
  endereco_entrega text not null default '',
  forma_pagamento text not null default '',
  total numeric(10, 2) not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Tabela de atualizacoes de preco
create table precos (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id) on delete cascade,
  preco_novo numeric(10, 2) not null,
  status status_preco not null default 'pendente',
  solicitado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now()
);

-- Tabela de logs
create table logs (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  payload jsonb not null default '{}',
  criado_em timestamptz not null default now()
);

-- Trigger para atualizar atualizado_em automaticamente
create or replace function set_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger clientes_atualizado_em
  before update on clientes
  for each row execute function set_atualizado_em();

create trigger pedidos_atualizado_em
  before update on pedidos
  for each row execute function set_atualizado_em();

-- Habilita RLS em todas as tabelas (policies na proxima migracao)
alter table clientes enable row level security;
alter table produtos enable row level security;
alter table pedidos enable row level security;
alter table precos enable row level security;
alter table logs enable row level security;
