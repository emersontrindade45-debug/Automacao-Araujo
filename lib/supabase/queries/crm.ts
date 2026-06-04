import { createClient } from "@/lib/supabase/server";
import type { Etapa, CanalOrigem } from "@/lib/types";

export type PeriodoDias = 7 | 30 | 90;

function dataInicio(dias: PeriodoDias): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString();
}

function dataPeriodoAnterior(dias: PeriodoDias): { inicio: string; fim: string } {
  const fim = new Date();
  fim.setDate(fim.getDate() - dias);
  const inicio = new Date(fim);
  inicio.setDate(inicio.getDate() - dias);
  return { inicio: inicio.toISOString(), fim: fim.toISOString() };
}

export interface CrmKpis {
  leadsNovos: number;
  pedidosCount: number;
  receitaTotal: number;
  ticketMedio: number;
  clientesFollowUp: number;
  leadsAnterior: number;
  pedidosAnterior: number;
  receitaAnterior: number;
}

export interface PipelineEtapa {
  etapa: Etapa;
  count: number;
}

export interface CanalStat {
  canal: CanalOrigem;
  leads: number;
  pedidos: number;
}

export interface ReceitaMensal {
  mes: string;
  receita: number;
  pedidos: number;
}

export interface PagamentoStat {
  forma: string;
  count: number;
  percentual: number;
}

export interface ProdutoStat {
  nome: string;
  quantidade: number;
  receita: number;
}

export interface RetencaoStats {
  clientesComPedido: number;
  clientesRecorrentes: number;
  mediaPedidosPorCliente: number;
  topClientes: { nome: string; pedidos: number; totalGasto: number }[];
}

export interface AutomacaoStats {
  handoffPedidoConfirmado: number;
  handoffAmbiguo: number;
  handoffSemResposta: number;
  followupDisparado: number;
  followupMovidoMarketing: number;
  taxaAutomatica: number;
}

export async function getCrmKpis(dias: PeriodoDias): Promise<CrmKpis> {
  const supabase = await createClient();
  const inicio = dataInicio(dias);
  const anterior = dataPeriodoAnterior(dias);

  const [leadsResult, pedidosResult, followUpResult, leadsPrevResult, pedidosPrevResult] =
    await Promise.all([
      supabase.from("clientes").select("id", { count: "exact", head: true }).gte("criado_em", inicio),
      supabase.from("pedidos").select("total").gte("criado_em", inicio),
      supabase.from("clientes").select("id", { count: "exact", head: true }).eq("etapa_atual", "follow_up"),
      supabase
        .from("clientes")
        .select("id", { count: "exact", head: true })
        .gte("criado_em", anterior.inicio)
        .lt("criado_em", anterior.fim),
      supabase
        .from("pedidos")
        .select("total")
        .gte("criado_em", anterior.inicio)
        .lt("criado_em", anterior.fim),
    ]);

  const pedidos = pedidosResult.data ?? [];
  const receitaTotal = pedidos.reduce((acc, p) => acc + Number(p.total), 0);

  const pedidosPrev = pedidosPrevResult.data ?? [];
  const receitaAnterior = pedidosPrev.reduce((acc, p) => acc + Number(p.total), 0);

  return {
    leadsNovos: leadsResult.count ?? 0,
    pedidosCount: pedidos.length,
    receitaTotal,
    ticketMedio: pedidos.length > 0 ? receitaTotal / pedidos.length : 0,
    clientesFollowUp: followUpResult.count ?? 0,
    leadsAnterior: leadsPrevResult.count ?? 0,
    pedidosAnterior: pedidosPrev.length,
    receitaAnterior,
  };
}

export async function getCrmPipeline(): Promise<PipelineEtapa[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("clientes").select("etapa_atual");

  const contagem = new Map<string, number>();
  for (const c of data ?? []) {
    contagem.set(c.etapa_atual, (contagem.get(c.etapa_atual) ?? 0) + 1);
  }

  const ordem: Etapa[] = [
    "novo", "atendimento", "fechamento", "pedido_gerado",
    "separacao", "em_rota", "entregue", "cancelado", "pos_venda", "follow_up", "marketing",
  ];

  return ordem.map((etapa) => ({ etapa, count: contagem.get(etapa) ?? 0 }));
}

export async function getCrmCanais(dias: PeriodoDias): Promise<CanalStat[]> {
  const supabase = await createClient();
  const inicio = dataInicio(dias);

  const [clientesResult, pedidosResult] = await Promise.all([
    // Conta por atualizado_em — captura clientes recorrentes que voltaram por canal diferente
    supabase.from("clientes").select("id, canal_origem").gte("atualizado_em", inicio),
    supabase.from("pedidos").select("cliente_id, origem_conversa").gte("criado_em", inicio),
  ]);

  const clientes = clientesResult.data ?? [];
  const pedidos = pedidosResult.data ?? [];

  const canais: CanalOrigem[] = ["whatsapp", "instagram", "landpage"];
  return canais.map((canal) => {
    const leadsCanal = clientes.filter((c) => c.canal_origem === canal);
    const pedidosCanal = pedidos.filter((p) =>
      (p.origem_conversa ?? "whatsapp") === canal
    );
    return {
      canal,
      leads: leadsCanal.length,
      pedidos: pedidosCanal.length,
    };
  });
}

export async function getCrmReceitaMensal(): Promise<ReceitaMensal[]> {
  const supabase = await createClient();

  const inicio = new Date();
  inicio.setMonth(inicio.getMonth() - 5);
  inicio.setDate(1);
  inicio.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("pedidos")
    .select("total, criado_em")
    .gte("criado_em", inicio.toISOString());

  const nomeMes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const mesesMap = new Map<string, { receita: number; pedidos: number }>();

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    mesesMap.set(key, { receita: 0, pedidos: 0 });
  }

  for (const p of data ?? []) {
    const d = new Date(p.criado_em);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = mesesMap.get(key);
    if (entry) {
      entry.receita += Number(p.total);
      entry.pedidos += 1;
    }
  }

  return Array.from(mesesMap.entries()).map(([key, val]) => ({
    mes: nomeMes[parseInt(key.split("-")[1]) - 1],
    ...val,
  }));
}

export async function getCrmPagamentos(dias: PeriodoDias): Promise<PagamentoStat[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pedidos")
    .select("forma_pagamento")
    .gte("criado_em", dataInicio(dias));

  const contagem = new Map<string, number>();
  for (const p of data ?? []) {
    const forma = p.forma_pagamento?.trim() || "Não informado";
    contagem.set(forma, (contagem.get(forma) ?? 0) + 1);
  }

  const total = data?.length ?? 0;
  return Array.from(contagem.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([forma, count]) => ({
      forma,
      count,
      percentual: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
}

export async function getCrmTopProdutos(dias: PeriodoDias): Promise<ProdutoStat[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pedidos")
    .select("itens")
    .gte("criado_em", dataInicio(dias));

  const prodMap = new Map<string, { quantidade: number; receita: number }>();

  for (const pedido of data ?? []) {
    const itens = Array.isArray(pedido.itens) ? pedido.itens : [];
    for (const item of itens) {
      const nome: string = item.nome ?? "Desconhecido";
      const qty = Number(item.quantidade) || 0;
      const preco = Number(item.preco_unitario) || 0;
      const entry = prodMap.get(nome) ?? { quantidade: 0, receita: 0 };
      entry.quantidade += qty;
      entry.receita += qty * preco;
      prodMap.set(nome, entry);
    }
  }

  return Array.from(prodMap.entries())
    .sort((a, b) => b[1].quantidade - a[1].quantidade)
    .slice(0, 10)
    .map(([nome, val]) => ({ nome, ...val }));
}

export async function getCrmRetencao(): Promise<RetencaoStats> {
  const supabase = await createClient();

  const [pedidosResult, clientesResult] = await Promise.all([
    supabase.from("pedidos").select("cliente_id, total"),
    supabase.from("clientes").select("id, nome"),
  ]);

  const pedidos = pedidosResult.data ?? [];
  const nomeMap = new Map((clientesResult.data ?? []).map((c) => [c.id, c.nome]));

  const porCliente = new Map<string, { count: number; total: number }>();
  for (const p of pedidos) {
    const entry = porCliente.get(p.cliente_id) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total += Number(p.total);
    porCliente.set(p.cliente_id, entry);
  }

  const valores = Array.from(porCliente.values());
  const comPedido = porCliente.size;
  const recorrentes = valores.filter((v) => v.count > 1).length;
  const totalPedidos = valores.reduce((a, v) => a + v.count, 0);

  const topClientes = Array.from(porCliente.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)
    .map(([id, val]) => ({
      nome: nomeMap.get(id) ?? "Desconhecido",
      pedidos: val.count,
      totalGasto: val.total,
    }));

  return {
    clientesComPedido: comPedido,
    clientesRecorrentes: recorrentes,
    mediaPedidosPorCliente: comPedido > 0 ? Math.round((totalPedidos / comPedido) * 10) / 10 : 0,
    topClientes,
  };
}

export async function getCrmAutomacao(dias: PeriodoDias): Promise<AutomacaoStats> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("logs")
    .select("tipo")
    .in("tipo", [
      "handoff_pedido_confirmado",
      "handoff_ambiguo",
      "handoff_sem_resposta",
      "followup_disparado",
      "followup_movido_marketing",
    ])
    .gte("criado_em", dataInicio(dias));

  const c = new Map<string, number>();
  for (const log of data ?? []) {
    c.set(log.tipo, (c.get(log.tipo) ?? 0) + 1);
  }

  const confirmados = c.get("handoff_pedido_confirmado") ?? 0;
  const ambiguos = c.get("handoff_ambiguo") ?? 0;
  const semResposta = c.get("handoff_sem_resposta") ?? 0;
  const totalHandoffs = confirmados + ambiguos + semResposta;

  return {
    handoffPedidoConfirmado: confirmados,
    handoffAmbiguo: ambiguos,
    handoffSemResposta: semResposta,
    followupDisparado: c.get("followup_disparado") ?? 0,
    followupMovidoMarketing: c.get("followup_movido_marketing") ?? 0,
    taxaAutomatica: totalHandoffs > 0 ? Math.round((confirmados / totalHandoffs) * 100) : 0,
  };
}
