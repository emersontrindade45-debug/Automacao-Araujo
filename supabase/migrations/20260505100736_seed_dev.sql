-- Seed de desenvolvimento — dados realistas para o Araujo Hub
-- Executar apenas em ambiente de dev/staging

-- Produtos
insert into produtos (id, nome, preco_atual, unidade, ativo) values
  ('a1b2c3d4-0001-0001-0001-000000000001', 'Alcatra', 45.90, 'kg', true),
  ('a1b2c3d4-0001-0001-0001-000000000002', 'Picanha', 89.90, 'kg', true),
  ('a1b2c3d4-0001-0001-0001-000000000003', 'Frango inteiro', 18.50, 'kg', true),
  ('a1b2c3d4-0001-0001-0001-000000000004', 'Costela bovina', 38.00, 'kg', true),
  ('a1b2c3d4-0001-0001-0001-000000000005', 'Linguiça toscana', 22.00, 'kg', true),
  ('a1b2c3d4-0001-0001-0001-000000000006', 'Pão francês', 0.90, 'unidade', true),
  ('a1b2c3d4-0001-0001-0001-000000000007', 'Pão de forma', 8.50, 'pacote', true),
  ('a1b2c3d4-0001-0001-0001-000000000008', 'Arroz 5kg', 28.00, 'pacote', true),
  ('a1b2c3d4-0001-0001-0001-000000000009', 'Feijão carioca 1kg', 9.50, 'pacote', true),
  ('a1b2c3d4-0001-0001-0001-000000000010', 'Óleo de soja 900ml', 7.80, 'unidade', true);

-- Clientes
insert into clientes (id, nome, telefone, canal_origem, etapa_atual) values
  ('b2c3d4e5-0002-0002-0002-000000000001', 'Maria Aparecida Santos', '11987654321', 'whatsapp', 'novo'),
  ('b2c3d4e5-0002-0002-0002-000000000002', 'João Carlos Oliveira', '11976543210', 'whatsapp', 'atendimento'),
  ('b2c3d4e5-0002-0002-0002-000000000003', 'Ana Paula Ferreira', '11965432109', 'instagram', 'fechamento'),
  ('b2c3d4e5-0002-0002-0002-000000000004', 'Carlos Eduardo Lima', '11954321098', 'whatsapp', 'pedido_gerado'),
  ('b2c3d4e5-0002-0002-0002-000000000005', 'Fernanda Costa Souza', '11943210987', 'landpage', 'separacao'),
  ('b2c3d4e5-0002-0002-0002-000000000006', 'Roberto Alves Pereira', '11932109876', 'whatsapp', 'em_rota'),
  ('b2c3d4e5-0002-0002-0002-000000000007', 'Luciana Mendes Rocha', '11921098765', 'instagram', 'pos_venda'),
  ('b2c3d4e5-0002-0002-0002-000000000008', 'Paulo Henrique Gomes', '11910987654', 'whatsapp', 'follow_up'),
  ('b2c3d4e5-0002-0002-0002-000000000009', 'Tatiana Barbosa Cruz', '11909876543', 'whatsapp', 'novo'),
  ('b2c3d4e5-0002-0002-0002-000000000010', 'Diego Martins Nunes', '11998765432', 'instagram', 'atendimento');

-- Pedidos
insert into pedidos (id, cliente_id, itens, status, endereco_entrega, forma_pagamento, total) values
  (
    'c3d4e5f6-0003-0003-0003-000000000001',
    'b2c3d4e5-0002-0002-0002-000000000004',
    '[
      {"produto_id": "a1b2c3d4-0001-0001-0001-000000000001", "nome": "Alcatra", "quantidade": 2, "preco_unitario": 45.90},
      {"produto_id": "a1b2c3d4-0001-0001-0001-000000000008", "nome": "Arroz 5kg", "quantidade": 1, "preco_unitario": 28.00}
    ]'::jsonb,
    'pedido_gerado',
    'Rua das Flores, 123 – Jardim Primavera',
    'PIX',
    119.80
  ),
  (
    'c3d4e5f6-0003-0003-0003-000000000002',
    'b2c3d4e5-0002-0002-0002-000000000005',
    '[
      {"produto_id": "a1b2c3d4-0001-0001-0001-000000000002", "nome": "Picanha", "quantidade": 1, "preco_unitario": 89.90},
      {"produto_id": "a1b2c3d4-0001-0001-0001-000000000005", "nome": "Linguiça toscana", "quantidade": 2, "preco_unitario": 22.00}
    ]'::jsonb,
    'separacao',
    'Av. Brasil, 456 – Centro',
    'Cartão de crédito',
    133.90
  ),
  (
    'c3d4e5f6-0003-0003-0003-000000000003',
    'b2c3d4e5-0002-0002-0002-000000000006',
    '[
      {"produto_id": "a1b2c3d4-0001-0001-0001-000000000003", "nome": "Frango inteiro", "quantidade": 3, "preco_unitario": 18.50},
      {"produto_id": "a1b2c3d4-0001-0001-0001-000000000009", "nome": "Feijão carioca 1kg", "quantidade": 2, "preco_unitario": 9.50}
    ]'::jsonb,
    'em_rota',
    'Rua do Comércio, 789 – Vila Nova',
    'Dinheiro',
    74.50
  );

-- Solicitações de atualização de preço
insert into precos (produto_id, preco_novo, status) values
  ('a1b2c3d4-0001-0001-0001-000000000001', 49.90, 'pendente'),
  ('a1b2c3d4-0001-0001-0001-000000000002', 95.00, 'pendente'),
  ('a1b2c3d4-0001-0001-0001-000000000008', 30.00, 'aprovado'),
  ('a1b2c3d4-0001-0001-0001-000000000006', 1.10, 'rejeitado');
