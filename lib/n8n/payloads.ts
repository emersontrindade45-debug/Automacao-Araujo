import type { HandoffPayload, CanalOrigem, Etapa, ItemPedido } from "@/lib/types";

export function buildHandoffPayload(params: {
  nome: string;
  telefone: string;
  canal_origem: CanalOrigem;
  etapa: Etapa;
  ultimas_mensagens?: string[];
  itens_pedido?: ItemPedido[];
  proxima_acao: string;
}): HandoffPayload {
  return {
    nome: params.nome,
    telefone: params.telefone,
    canal_origem: params.canal_origem,
    etapa: params.etapa,
    ultimas_mensagens: params.ultimas_mensagens ?? [],
    itens_pedido: params.itens_pedido ?? [],
    proxima_acao: params.proxima_acao,
  };
}

export function buildPriceUpdatePayload(params: {
  produto_id: string;
  produto_nome: string;
  preco_novo: number;
  solicitado_por: string;
}) {
  return {
    tipo: "atualizacao_preco" as const,
    produto_id: params.produto_id,
    produto_nome: params.produto_nome,
    preco_novo: params.preco_novo,
    solicitado_por: params.solicitado_por,
  };
}

export function buildFollowUpPayload(params: {
  cliente_id: string;
  nome: string;
  telefone: string;
  canal_origem: CanalOrigem;
  dias_sem_resposta: number;
  mensagem: string;
}) {
  return {
    tipo: "follow_up" as const,
    cliente_id: params.cliente_id,
    nome: params.nome,
    telefone: params.telefone,
    canal_origem: params.canal_origem,
    dias_sem_resposta: params.dias_sem_resposta,
    mensagem: params.mensagem,
  };
}
