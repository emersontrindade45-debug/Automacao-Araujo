-- Ajusta solicitado_por em precos para aceitar texto livre (nome/telefone do WhatsApp)
-- em vez de UUID (nem sempre teremos um usuário autenticado ao receber via webhook)
alter table precos
  alter column solicitado_por type text using solicitado_por::text;

-- Remove a constraint FK para auth.users que não se aplica mais
alter table precos drop constraint if exists precos_solicitado_por_fkey;

-- Tabela de configurações do sistema (chave-valor flexível)
create table configuracoes (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  valor jsonb not null default '{}',
  atualizado_em timestamptz not null default now()
);

alter table configuracoes enable row level security;

-- Somente admin pode ler e escrever configurações
create policy "admin_read_configuracoes" on configuracoes
  for select using (
    (auth.jwt() -> 'app_metadata' ->> 'papel') = 'admin'
  );

create policy "admin_write_configuracoes" on configuracoes
  for all using (
    (auth.jwt() -> 'app_metadata' ->> 'papel') = 'admin'
  );

-- Seed de configuração padrão de follow-up
insert into configuracoes (chave, valor)
values (
  'followup',
  '{"dias_inatividade": 3, "max_tentativas": 3, "mensagem": "Olá! Vimos que você ainda não finalizou seu pedido. Podemos ajudar?"}'::jsonb
)
on conflict (chave) do nothing;
