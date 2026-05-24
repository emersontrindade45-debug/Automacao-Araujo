import type { AutomacaoStats } from "@/lib/supabase/queries/crm";

interface AutomacaoStatsProps {
  automacao: AutomacaoStats;
}

export function AutomacaoStatsCard({ automacao }: AutomacaoStatsProps) {
  const {
    handoffPedidoConfirmado,
    handoffAmbiguo,
    handoffSemResposta,
    followupDisparado,
    followupMovidoMarketing,
    taxaAutomatica,
  } = automacao;

  const totalHandoffs = handoffPedidoConfirmado + handoffAmbiguo + handoffSemResposta;
  const followupRecuperado = followupDisparado - followupMovidoMarketing;
  const taxaRecuperacao = followupDisparado > 0
    ? Math.round((followupRecuperado / followupDisparado) * 100)
    : 0;

  const corTaxaAuto = taxaAutomatica >= 70 ? "text-success" : taxaAutomatica >= 40 ? "text-warning" : "text-danger";
  const corRecuperacao = taxaRecuperacao >= 30 ? "text-success" : taxaRecuperacao >= 15 ? "text-warning" : "text-danger";

  return (
    <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Automação (IA)</h2>
        <p className="text-xs text-muted mt-0.5">Desempenho do agente e follow-up</p>
      </div>

      {/* Taxa de resolução automática */}
      <div className="bg-surface-subtle rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted font-medium">Resolvido pela IA</p>
          <span className={["text-2xl font-bold", corTaxaAuto].join(" ")}>{taxaAutomatica}%</span>
        </div>
        <div className="bg-surface rounded-full h-2 overflow-hidden">
          <div
            className="h-2 rounded-full bg-success transition-all"
            style={{ width: `${taxaAutomatica}%` }}
          />
        </div>
        <p className="text-xs text-subtle mt-1.5">
          {handoffPedidoConfirmado} pedidos fechados · {totalHandoffs - handoffPedidoConfirmado} foram para humano
        </p>
      </div>

      {/* Detalhamento de handoffs */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted">Handoffs ({totalHandoffs} total)</p>
        {[
          { label: "Pedido confirmado", valor: handoffPedidoConfirmado, cor: "bg-success" },
          { label: "Mensagem ambígua", valor: handoffAmbiguo, cor: "bg-warning" },
          { label: "Sem resposta",     valor: handoffSemResposta,  cor: "bg-danger" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className={["h-2 w-2 rounded-full shrink-0", item.cor].join(" ")} />
            <span className="text-xs text-muted flex-1">{item.label}</span>
            <span className="text-xs font-semibold text-foreground">{item.valor}</span>
          </div>
        ))}
      </div>

      {/* Follow-up */}
      <div className="border-t border-border pt-4 space-y-2">
        <p className="text-xs font-medium text-muted">Follow-up</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">Disparados</span>
          <span className="text-sm font-semibold text-foreground">{followupDisparado}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">Taxa de recuperação</span>
          <span className={["text-sm font-semibold", corRecuperacao].join(" ")}>{taxaRecuperacao}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">Movidos para marketing</span>
          <span className="text-sm font-semibold text-danger">{followupMovidoMarketing}</span>
        </div>
      </div>
    </div>
  );
}
