import type { ReceitaMensal, PagamentoStat } from "@/lib/supabase/queries/crm";

function fmt(v: number) {
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

interface ReceitaChartProps {
  meses: ReceitaMensal[];
  pagamentos: PagamentoStat[];
}

export function ReceitaChart({ meses, pagamentos }: ReceitaChartProps) {
  const maxReceita = Math.max(...meses.map((m) => m.receita), 1);
  const totalReceita = meses.reduce((a, m) => a + m.receita, 0);

  // SVG line chart
  const W = 480;
  const H = 100;
  const PAD = 8;
  const n = meses.length;

  const pontos = meses.map((m, i) => ({
    x: n > 1 ? PAD + (i / (n - 1)) * (W - PAD * 2) : W / 2,
    y: H - PAD - ((m.receita / maxReceita) * (H - PAD * 2)),
    receita: m.receita,
    mes: m.mes,
  }));

  const polyline = pontos.map((p) => `${p.x},${p.y}`).join(" ");
  const area = [
    `${pontos[0].x},${H}`,
    ...pontos.map((p) => `${p.x},${p.y}`),
    `${pontos[pontos.length - 1].x},${H}`,
  ].join(" ");

  return (
    <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Receita Mensal</h2>
          <p className="text-xs text-muted mt-0.5">Últimos 6 meses</p>
        </div>
        <span className="text-lg font-bold text-foreground">{fmt(totalReceita)}</span>
      </div>

      {/* SVG line chart */}
      <div className="w-full">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: 100 }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="receitaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e89309" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#e89309" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={area} fill="url(#receitaGradient)" />
          <polyline
            points={polyline}
            fill="none"
            stroke="#e89309"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {pontos.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill="#e89309" />
          ))}
        </svg>
        <div className="flex justify-between mt-1">
          {meses.map((m) => (
            <span key={m.mes} className="text-[10px] text-subtle">{m.mes}</span>
          ))}
        </div>
      </div>

      {/* Pagamentos */}
      {pagamentos.length > 0 && (
        <div className="border-t border-border pt-4">
          <p className="text-xs font-medium text-muted mb-3">Forma de pagamento</p>
          <div className="space-y-2">
            {pagamentos.slice(0, 4).map((p) => (
              <div key={p.forma} className="flex items-center gap-2">
                <span className="text-xs text-muted w-24 truncate">{p.forma}</span>
                <div className="flex-1 bg-surface-subtle rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full bg-brand"
                    style={{ width: `${p.percentual}%` }}
                  />
                </div>
                <span className="text-xs text-subtle w-8 text-right">{p.percentual}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
