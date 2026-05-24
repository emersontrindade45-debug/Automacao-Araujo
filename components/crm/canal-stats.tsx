import type { CanalStat } from "@/lib/supabase/queries/crm";

const CANAL_CONFIG = {
  whatsapp:  { label: "WhatsApp",  cor: "#25d366", icone: "W" },
  instagram: { label: "Instagram", cor: "#e1306c", icone: "I" },
  landpage:  { label: "Landpage",  cor: "#6366f1", icone: "L" },
};

interface CanalStatsProps {
  canais: CanalStat[];
}

export function CanalStats({ canais }: CanalStatsProps) {
  const totalLeads = canais.reduce((a, c) => a + c.leads, 0);

  return (
    <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Origem dos Leads</h2>
        <p className="text-xs text-muted mt-0.5">Volume e conversão por canal no período</p>
      </div>

      <div className="space-y-4">
        {canais.map(({ canal, leads, pedidos }) => {
          const cfg = CANAL_CONFIG[canal];
          const pct = totalLeads > 0 ? Math.round((leads / totalLeads) * 100) : 0;
          const conversao = leads > 0 ? Math.round((pedidos / leads) * 100) : 0;

          return (
            <div key={canal} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-5 w-5 rounded text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                    style={{ backgroundColor: cfg.cor }}
                  >
                    {cfg.icone}
                  </span>
                  <span className="text-sm font-medium text-foreground">{cfg.label}</span>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <p className="text-xs text-muted">Leads</p>
                    <p className="text-sm font-semibold text-foreground">{leads}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Conversão</p>
                    <p className="text-sm font-semibold" style={{ color: conversao >= 30 ? "#16a34a" : conversao >= 15 ? "#d97706" : "#dc2626" }}>
                      {conversao}%
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-surface-subtle rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-1.5 rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: cfg.cor, opacity: 0.7 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {totalLeads === 0 && (
        <p className="text-xs text-subtle text-center py-4">Nenhum lead no período</p>
      )}
    </div>
  );
}
