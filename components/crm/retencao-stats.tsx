import type { RetencaoStats } from "@/lib/supabase/queries/crm";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

interface RetencaoStatsProps {
  retencao: RetencaoStats;
}

export function RetencaoStatsCard({ retencao }: RetencaoStatsProps) {
  const { clientesComPedido, clientesRecorrentes, mediaPedidosPorCliente, topClientes } = retencao;
  const pctRecorrentes = clientesComPedido > 0
    ? Math.round((clientesRecorrentes / clientesComPedido) * 100)
    : 0;

  return (
    <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Retenção de Clientes</h2>
        <p className="text-xs text-muted mt-0.5">Quem voltou a comprar</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-subtle rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{clientesComPedido}</p>
          <p className="text-xs text-muted mt-0.5">Com pedido</p>
        </div>
        <div className="bg-surface-subtle rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-success">{pctRecorrentes}%</p>
          <p className="text-xs text-muted mt-0.5">Recorrentes</p>
        </div>
        <div className="bg-surface-subtle rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{mediaPedidosPorCliente}</p>
          <p className="text-xs text-muted mt-0.5">Média pedidos</p>
        </div>
      </div>

      {topClientes.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted mb-2">Melhores clientes</p>
          <div className="space-y-0 divide-y divide-border">
            {topClientes.map((c, i) => (
              <div key={c.nome} className="flex items-center gap-2 py-2">
                <span className="h-5 w-5 rounded-full bg-surface-subtle text-subtle text-[10px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm text-foreground truncate">{c.nome}</span>
                <span className="text-xs text-muted">{c.pedidos} ped.</span>
                <span className="text-sm font-semibold text-foreground">{fmt(c.totalGasto)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
