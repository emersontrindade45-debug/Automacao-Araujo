export type Papel = "admin" | "atendimento" | "separacao" | "expedicao" | "followup";

export type CanalOrigem = "whatsapp" | "instagram" | "landpage";

export type Etapa =
  | "novo"
  | "atendimento"
  | "fechamento"
  | "pedido_gerado"
  | "separacao"
  | "em_rota"
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
}

export interface Produto {
  id: string;
  nome: string;
  preco_atual: number;
  estoque_atual: number;
  unidade: string;
  ativo: boolean;
  criado_em: string;
}

export interface ItemPedido {
  produto_id: string;
  nome: string;
  quantidade: number;
  preco_unitario: number;
}

export interface Pedido {
  id: string;
  cliente_id: string;
  itens: ItemPedido[];
  status: Etapa;
  endereco_entrega: string;
  forma_pagamento: string;
  total: number;
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
