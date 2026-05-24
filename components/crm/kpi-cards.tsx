import type { CrmKpis } from "@/lib/supabase/queries/crm";

function delta(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Math.round(((atual - anterior) / anterior) * 100);
}

function Tendencia({ atual, anterior }: { atual: number; anterior: number }) {
  const pct = delta(atual, anterior);
  if (pct === null) return <span className="text-subtle text-xs">—</span>;

  const positivo = pct >= 0;
  return (
    <span className={["text-xs font-medium flex items-center gap-0.5", positivo ? "text-success" : "text-danger"].join(" ")}>
      {positivo ? (
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 2l4 6H2z" />
        </svg>
      ) : (
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 10L2 4h8z" />
        </svg>
      )}
      {Math.abs(pct)}%
    </span>
  );
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

interface KpiCardsProps {
  kpis: CrmKpis;
}

export function KpiCards({ kpis }: KpiCardsProps) {
  const cards = [
    {
      label: "Leads novos",
      valor: kpis.leadsNovos.toString(),
      tendencia: <Tendencia atual={kpis.leadsNovos} anterior={kpis.leadsAnterior} />,
      icone: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
    },
    {
      label: "Pedidos",
      valor: kpis.pedidosCount.toString(),
      tendencia: <Tendencia atual={kpis.pedidosCount} anterior={kpis.pedidosAnterior} />,
      icone: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 01-8 0" />
        </svg>
      ),
    },
    {
      label: "Receita",
      valor: fmt(kpis.receitaTotal),
      tendencia: <Tendencia atual={kpis.receitaTotal} anterior={kpis.receitaAnterior} />,
      icone: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      ),
    },
    {
      label: "Ticket médio",
      valor: fmt(kpis.ticketMedio),
      tendencia: null,
      icone: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      ),
    },
    {
      label: "Em follow-up",
      valor: kpis.clientesFollowUp.toString(),
      tendencia: null,
      alerta: kpis.clientesFollowUp > 10,
      icone: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={[
            "bg-surface border rounded-xl p-4 flex flex-col gap-2",
            "alerta" in card && card.alerta ? "border-warning-border" : "border-border",
          ].join(" ")}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted font-medium">{card.label}</span>
            <span className={"alerta" in card && card.alerta ? "text-warning" : "text-subtle"}>
              {card.icone}
            </span>
          </div>
          <span className="text-2xl font-bold text-foreground tracking-tight">{card.valor}</span>
          <div className="h-4">{card.tendencia ?? <span className="text-xs text-subtle">vs período anterior</span>}</div>
        </div>
      ))}
    </div>
  );
}
