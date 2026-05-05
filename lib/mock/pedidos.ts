import type { Pedido } from "@/lib/types";

export const mockPedidos: Pedido[] = [
  {
    id: "ped1",
    cliente_id: "c4",
    itens: [
      { produto_id: "p2", nome: "Frango Inteiro (kg)", quantidade: 2, preco_unitario: 18.5 },
      { produto_id: "p3", nome: "Linguiça Toscana (kg)", quantidade: 1, preco_unitario: 29.9 },
      { produto_id: "p7", nome: "Queijo Mussarela (kg)", quantidade: 0.5, preco_unitario: 49.9 },
    ],
    status: "pedido_gerado",
    endereco_entrega: "Rua das Flores, 123 – Vila Nova, São Paulo/SP",
    forma_pagamento: "Pix",
    total: 91.75,
    criado_em: "2026-04-28T13:00:00Z",
    atualizado_em: "2026-04-28T13:00:00Z",
  },
  {
    id: "ped2",
    cliente_id: "c5",
    itens: [
      { produto_id: "p5", nome: "Pão Francês (un)", quantidade: 10, preco_unitario: 0.75 },
      { produto_id: "p8", nome: "Presunto Cozido (kg)", quantidade: 0.2, preco_unitario: 39.9 },
      { produto_id: "p9", nome: "Leite Integral 1L", quantidade: 2, preco_unitario: 5.2 },
    ],
    status: "separacao",
    endereco_entrega: "Av. Paulista, 1000 – Bela Vista, São Paulo/SP",
    forma_pagamento: "Cartão de Débito",
    total: 25.28,
    criado_em: "2026-04-28T12:00:00Z",
    atualizado_em: "2026-04-28T14:00:00Z",
  },
  {
    id: "ped3",
    cliente_id: "c6",
    itens: [
      { produto_id: "p1", nome: "Alcatra (kg)", quantidade: 1.5, preco_unitario: 52.9 },
      { produto_id: "p4", nome: "Costela Bovina (kg)", quantidade: 2, preco_unitario: 44.0 },
      { produto_id: "p10", nome: "Arroz Branco 5kg", quantidade: 1, preco_unitario: 28.9 },
      { produto_id: "p11", nome: "Feijão Carioca 1kg", quantidade: 2, preco_unitario: 9.9 },
    ],
    status: "em_rota",
    endereco_entrega: "Rua Augusta, 500 – Consolação, São Paulo/SP",
    forma_pagamento: "Dinheiro",
    total: 195.15,
    criado_em: "2026-04-28T10:00:00Z",
    atualizado_em: "2026-04-28T15:00:00Z",
  },
  {
    id: "ped4",
    cliente_id: "c7",
    itens: [
      { produto_id: "p6", nome: "Pão de Forma (pacote)", quantidade: 2, preco_unitario: 9.5 },
      { produto_id: "p9", nome: "Leite Integral 1L", quantidade: 4, preco_unitario: 5.2 },
      { produto_id: "p12", nome: "Óleo de Soja 900ml", quantidade: 1, preco_unitario: 7.5 },
    ],
    status: "pos_venda",
    endereco_entrega: "Rua Oscar Freire, 800 – Jardins, São Paulo/SP",
    forma_pagamento: "Pix",
    total: 49.3,
    criado_em: "2026-04-27T14:00:00Z",
    atualizado_em: "2026-04-28T16:00:00Z",
  },
  {
    id: "ped5",
    cliente_id: "c3",
    itens: [
      { produto_id: "p5", nome: "Pão Francês (un)", quantidade: 20, preco_unitario: 0.75 },
      { produto_id: "p7", nome: "Queijo Mussarela (kg)", quantidade: 1, preco_unitario: 49.9 },
      { produto_id: "p8", nome: "Presunto Cozido (kg)", quantidade: 0.5, preco_unitario: 39.9 },
    ],
    status: "fechamento",
    endereco_entrega: "Av. Brigadeiro Faria Lima, 2500 – Pinheiros, São Paulo/SP",
    forma_pagamento: "Cartão de Crédito",
    total: 84.85,
    criado_em: "2026-04-28T11:00:00Z",
    atualizado_em: "2026-04-28T11:00:00Z",
  },
];

export const clienteNomes: Record<string, string> = {
  c3: "Ana Rodrigues",
  c4: "Carlos Oliveira",
  c5: "Patrícia Souza",
  c6: "Ricardo Lima",
  c7: "Fernanda Costa",
};
