-- Helper: retorna o papel do usuario autenticado via app_metadata (nao user_metadata)
create or replace function auth_papel()
returns papel language sql stable security definer
set search_path = ''
as $$
  select (auth.jwt() -> 'app_metadata' ->> 'papel')::public.papel;
$$;

-- ============================================================
-- CLIENTES
-- ============================================================
-- Qualquer usuario autenticado pode ler clientes
create policy "clientes_select" on clientes
  for select to authenticated
  using (true);

-- Admin e atendimento podem inserir clientes
create policy "clientes_insert" on clientes
  for insert to authenticated
  with check (auth_papel() in ('admin', 'atendimento'));

-- Admin e atendimento podem atualizar clientes
create policy "clientes_update" on clientes
  for update to authenticated
  using (auth_papel() in ('admin', 'atendimento'))
  with check (auth_papel() in ('admin', 'atendimento'));

-- Somente admin pode deletar clientes
create policy "clientes_delete" on clientes
  for delete to authenticated
  using (auth_papel() = 'admin');

-- ============================================================
-- PRODUTOS
-- ============================================================
-- Qualquer usuario autenticado pode ler produtos
create policy "produtos_select" on produtos
  for select to authenticated
  using (true);

-- Somente admin pode inserir/atualizar/deletar produtos
create policy "produtos_insert" on produtos
  for insert to authenticated
  with check (auth_papel() = 'admin');

create policy "produtos_update" on produtos
  for update to authenticated
  using (auth_papel() = 'admin')
  with check (auth_papel() = 'admin');

create policy "produtos_delete" on produtos
  for delete to authenticated
  using (auth_papel() = 'admin');

-- ============================================================
-- PEDIDOS
-- ============================================================
-- Qualquer usuario autenticado pode ler pedidos
create policy "pedidos_select" on pedidos
  for select to authenticated
  using (true);

-- Admin e atendimento podem criar pedidos
create policy "pedidos_insert" on pedidos
  for insert to authenticated
  with check (auth_papel() in ('admin', 'atendimento'));

-- Admin, atendimento, separacao e expedicao podem atualizar pedidos
create policy "pedidos_update" on pedidos
  for update to authenticated
  using (auth_papel() in ('admin', 'atendimento', 'separacao', 'expedicao'))
  with check (auth_papel() in ('admin', 'atendimento', 'separacao', 'expedicao'));

-- Somente admin pode deletar pedidos
create policy "pedidos_delete" on pedidos
  for delete to authenticated
  using (auth_papel() = 'admin');

-- ============================================================
-- PRECOS
-- ============================================================
-- Qualquer usuario autenticado pode ler solicitacoes de preco
create policy "precos_select" on precos
  for select to authenticated
  using (true);

-- Qualquer usuario autenticado pode solicitar atualizacao de preco
create policy "precos_insert" on precos
  for insert to authenticated
  with check (auth.uid() is not null);

-- Somente admin pode aprovar/rejeitar (atualizar status)
create policy "precos_update" on precos
  for update to authenticated
  using (auth_papel() = 'admin')
  with check (auth_papel() = 'admin');

-- ============================================================
-- LOGS
-- ============================================================
-- Somente admin pode ler logs
create policy "logs_select" on logs
  for select to authenticated
  using (auth_papel() = 'admin');

-- Qualquer usuario autenticado pode inserir logs (sistema)
create policy "logs_insert" on logs
  for insert to authenticated
  with check (auth.uid() is not null);
