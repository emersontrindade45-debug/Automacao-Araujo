import type { ProdutoStat } from "@/lib/supabase/queries/crm";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

interface TopProdutosProps {
  produtos: ProdutoStat[];
}

export function TopProdutos({ produtos }: TopProdutosProps) {
  const maxQtd = Math.max(...produtos.map((p) => p.quantidade), 1);

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">Produtos mais vendidos</h2>
        <p className="text-xs text-muted mt-0.5">Por quantidade no período</p>
      </div>

      {produtos.length === 0 ? (
        <p className="text-xs text-subtle text-center py-8">Nenhum pedido no período</p>
      ) : (
        <div className="space-y-0 divide-y divide-border">
          {produtos.map((prod, i) => (
            <div key={prod.nome} className="flex items-center gap-3 py-2.5">
              <span className="text-xs font-bold text-subtle w-5 text-right shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground font-medium truncate">{prod.nome}</p>
                <div className="mt-1 bg-surface-subtle rounded-full h-1 overflow-hidden">
                  <div
                    className="h-1 rounded-full bg-brand"
                    style={{ width: `${Math.round((prod.quantidade / maxQtd) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-foreground">{prod.quantidade}</p>
                <p className="text-[10px] text-subtle">{fmt(prod.receita)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
