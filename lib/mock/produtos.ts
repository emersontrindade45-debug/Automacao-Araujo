import type { Produto, StatusPreco } from "@/lib/types";

const base = { tipo: "produto" as const, descricao: null, validade: null, categoria: null, nicho: null, imagem_url: null };

export const mockProdutos: Produto[] = [
  { ...base, id: "p1", nome: "Alcatra (kg)", preco_atual: 52.9, unidade: "kg", ativo: true, criado_em: "2026-01-10T00:00:00Z" },
  { ...base, id: "p2", nome: "Frango Inteiro (kg)", preco_atual: 18.5, unidade: "kg", ativo: true, criado_em: "2026-01-10T00:00:00Z" },
  { ...base, id: "p3", nome: "Linguiça Toscana (kg)", preco_atual: 29.9, unidade: "kg", ativo: true, criado_em: "2026-01-10T00:00:00Z" },
  { ...base, id: "p4", nome: "Costela Bovina (kg)", preco_atual: 44.0, unidade: "kg", ativo: true, criado_em: "2026-01-10T00:00:00Z" },
  { ...base, id: "p5", nome: "Pão Francês (un)", preco_atual: 0.75, unidade: "un", ativo: true, criado_em: "2026-01-10T00:00:00Z" },
  { ...base, id: "p6", nome: "Pão de Forma (pacote)", preco_atual: 9.5, unidade: "pacote", ativo: true, criado_em: "2026-01-10T00:00:00Z" },
  { ...base, id: "p7", nome: "Queijo Mussarela (kg)", preco_atual: 49.9, unidade: "kg", ativo: true, criado_em: "2026-01-10T00:00:00Z" },
  { ...base, id: "p8", nome: "Presunto Cozido (kg)", preco_atual: 39.9, unidade: "kg", ativo: true, criado_em: "2026-01-10T00:00:00Z" },
  { ...base, id: "p9", nome: "Leite Integral 1L", preco_atual: 5.2, unidade: "L", ativo: true, criado_em: "2026-01-10T00:00:00Z" },
  { ...base, id: "p10", nome: "Arroz Branco 5kg", preco_atual: 28.9, unidade: "pacote", ativo: true, criado_em: "2026-01-10T00:00:00Z" },
  { ...base, id: "p11", nome: "Feijão Carioca 1kg", preco_atual: 9.9, unidade: "pacote", ativo: true, criado_em: "2026-01-10T00:00:00Z" },
  { ...base, id: "p12", nome: "Óleo de Soja 900ml", preco_atual: 7.5, unidade: "un", ativo: true, criado_em: "2026-01-10T00:00:00Z" },
];

export interface AtualizacaoPreco {
  id: string;
  produto_id: string;
  produto_nome: string;
  preco_atual: number;
  preco_novo: number;
  status: StatusPreco;
  solicitado_por: string;
  criado_em: string;
}

export const mockAtualizacoesPreco: AtualizacaoPreco[] = [
  {
    id: "ap1",
    produto_id: "p1",
    produto_nome: "Alcatra (kg)",
    preco_atual: 52.9,
    preco_novo: 57.5,
    status: "pendente",
    solicitado_por: "João Açougue",
    criado_em: "2026-04-28T08:00:00Z",
  },
  {
    id: "ap2",
    produto_id: "p3",
    produto_nome: "Linguiça Toscana (kg)",
    preco_atual: 29.9,
    preco_novo: 32.0,
    status: "pendente",
    solicitado_por: "João Açougue",
    criado_em: "2026-04-28T08:30:00Z",
  },
  {
    id: "ap3",
    produto_id: "p5",
    produto_nome: "Pão Francês (un)",
    preco_atual: 0.75,
    preco_novo: 0.9,
    status: "pendente",
    solicitado_por: "Maria Padaria",
    criado_em: "2026-04-27T16:00:00Z",
  },
  {
    id: "ap4",
    produto_id: "p7",
    produto_nome: "Queijo Mussarela (kg)",
    preco_atual: 49.9,
    preco_novo: 54.9,
    status: "aprovado",
    solicitado_por: "João Açougue",
    criado_em: "2026-04-26T10:00:00Z",
  },
  {
    id: "ap5",
    produto_id: "p10",
    produto_nome: "Arroz Branco 5kg",
    preco_atual: 28.9,
    preco_novo: 31.5,
    status: "rejeitado",
    solicitado_por: "Carlos Mercearia",
    criado_em: "2026-04-25T14:00:00Z",
  },
];
