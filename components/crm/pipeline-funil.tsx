import type { PipelineEtapa } from "@/lib/supabase/queries/crm";

const ETAPA_CONFIG: Record<string, { label: string; cor: string }> = {
  novo:          { label: "Novo",          cor: "#6366f1" },
  atendimento:   { label: "Atendimento",   cor: "#0ea5e9" },
  fechamento:    { label: "Fechamento",    cor: "#f59e0b" },
  pedido_gerado: { label: "Pedido gerado", cor: "#10b981" },
  separacao:     { label: "Separação",     cor: "#8b5cf6" },
  em_rota:       { label: "Em rota",       cor: "#f97316" },
  entregue:      { label: "Entregue",      cor: "#22c55e" },
  cancelado:     { label: "Cancelado",     cor: "#ef4444" },
  pos_venda:     { label: "Pós-venda",     cor: "#06b6d4" },
  follow_up:     { label: "Follow-up",     cor: "#ec4899" },
  marketing:     { label: "Marketing",     cor: "#84cc16" },
};

interface PipelineFunilProps {
  pipeline: PipelineEtapa[];
}

export function PipelineFunil({ pipeline }: PipelineFunilProps) {
  const total = pipeline.reduce((acc, e) => acc + e.count, 0);
  const max = Math.max(...pipeline.map((e) => e.count), 1);

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Pipeline</h2>
          <p className="text-xs text-muted mt-0.5">Distribuição atual dos clientes por etapa</p>
        </div>
        <span className="text-xs text-subtle bg-surface-subtle px-2.5 py-1 rounded-full border border-border">
          {total} total
        </span>
      </div>

      <div className="space-y-2.5">
        {pipeline.map(({ etapa, count }) => {
          const cfg = ETAPA_CONFIG[etapa];
          const pct = Math.round((count / max) * 100);
          const pctTotal = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <div key={etapa} className="flex items-center gap-3">
              <span className="text-xs text-muted w-28 shrink-0 text-right">{cfg.label}</span>
              <div className="flex-1 bg-surface-subtle rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: cfg.cor }}
                />
              </div>
              <span className="text-xs font-semibold text-foreground w-5 text-right">{count}</span>
              <span className="text-xs text-subtle w-8 text-right">{pctTotal}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
