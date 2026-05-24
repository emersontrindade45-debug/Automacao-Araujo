export type Papel = "admin" | "atendimento";

export type CanalOrigem = "whatsapp" | "instagram" | "landpage";

export type Etapa =
  | "novo"
  | "atendimento"
  | "fechamento"
  | "pedido_gerado"
  | "separacao"
  | "em_rota"
  | "entregue"
  | "pos_venda"
  | "follow_up"
  | "marketing";

export type StatusPreco = "pendente" | "aprovado" | "rejeitado";

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  canal_origem: CanalOrigem;
  etapa_atual: Etapa;
  criado_em: string;
  atualizado_em: string;
  endereco_entrega?: string | null;
}

export type TipoProduto = "produto" | "kit" | "oferta";

export interface Produto {
  id: string;
  nome: string;
  preco_atual: number;
  estoque_atual: number;
  unidade: string;
  ativo: boolean;
  criado_em: string;
  tipo: TipoProduto;
  descricao: string | null;
  validade: string | null;
  categoria: string | null;
  disponivel: boolean;
}

export interface ItemPedido {
  produto_id: string;
  nome: string;
  quantidade: number;
  preco_unitario: number;
}

export interface Pedido {
  id: string;
  numero_pedido: number;
  cliente_id: string;
  itens: ItemPedido[];
  status: Etapa;
  endereco_entrega: string;
  forma_pagamento: string;
  total: number;
  valor_final?: number | null;
  criado_em: string;
  atualizado_em: string;
}

export interface HandoffPayload {
  nome: string;
  telefone: string;
  canal_origem: CanalOrigem;
  etapa: Etapa;
  ultimas_mensagens: string[];
  itens_pedido: ItemPedido[];
  proxima_acao: string;
}

export interface LogEvento {
  id: string;
  tipo: string;
  payload: {
    cliente_id?: string;
    proxima_acao?: string;
    handoff?: {
      nome?: string;
      telefone?: string;
      canal_origem?: string;
      itens_pedido?: ItemPedido[];
      forma_pagamento?: string;
      endereco_entrega?: string;
      ultimas_mensagens?: string[];
      proxima_acao?: string;
    };
  };
  criado_em: string;
}
