-- Papéis de usuário (JWT app_metadata.papel): apenas admin | atendimento.
-- auth_papel() retorna text normalizado; política de pedidos alinha-se a clientes.
-- Remove o enum papel (não usado em colunas de tabela).

create or replace function public.auth_papel()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case lower(trim(coalesce(auth.jwt() -> 'app_metadata' ->> 'papel', '')))
    when 'admin' then 'admin'
    else 'atendimento'
  end;
$$;

drop policy if exists "pedidos_update" on public.pedidos;

create policy "pedidos_update" on public.pedidos
  for update to authenticated
  using (public.auth_papel() in ('admin', 'atendimento'))
  with check (public.auth_papel() in ('admin', 'atendimento'));

drop type if exists public.papel;
