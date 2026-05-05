import { PrecosTable } from "@/components/precos/precos-table";
import { mockAtualizacoesPreco } from "@/lib/mock/produtos";

export const metadata = { title: "Preços – Araujo Hub" };

export default function PrecosPage() {
  const pendentes = mockAtualizacoesPreco.filter((a) => a.status === "pendente").length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Preços</h1>
          <p className="text-sm text-muted mt-0.5">Revise e aprove atualizações de preço</p>
        </div>
        {pendentes > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-warning-bg text-warning border border-[var(--warning-border)] px-3 py-1.5 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-warning inline-block" />
            {pendentes} pendente{pendentes > 1 ? "s" : ""}
          </span>
        )}
      </div>
      <PrecosTable atualizacoes={mockAtualizacoesPreco} />
    </div>
  );
}
