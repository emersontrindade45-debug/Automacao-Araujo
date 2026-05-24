import Link from "next/link";
import {
  getCrmKpis,
  getCrmPipeline,
  getCrmCanais,
  getCrmReceitaMensal,
  getCrmPagamentos,
  getCrmTopProdutos,
  getCrmRetencao,
  getCrmAutomacao,
  type PeriodoDias,
} from "@/lib/supabase/queries/crm";
import { KpiCards } from "@/components/crm/kpi-cards";
import { PipelineFunil } from "@/components/crm/pipeline-funil";
import { CanalStats } from "@/components/crm/canal-stats";
import { ReceitaChart } from "@/components/crm/receita-chart";
import { TopProdutos } from "@/components/crm/top-produtos";
import { RetencaoStatsCard } from "@/components/crm/retencao-stats";
import { AutomacaoStatsCard } from "@/components/crm/automacao-stats";

export const metadata = { title: "CRM – Araujo Hub" };

const PERIODOS: PeriodoDias[] = [7, 30, 90];

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const params = await searchParams;
  const raw = Number(params.periodo);
  const periodo: PeriodoDias = (PERIODOS.includes(raw as PeriodoDias) ? raw : 30) as PeriodoDias;

  const [kpis, pipeline, canais, meses, pagamentos, produtos, retencao, automacao] =
    await Promise.all([
      getCrmKpis(periodo),
      getCrmPipeline(),
      getCrmCanais(periodo),
      getCrmReceitaMensal(),
      getCrmPagamentos(periodo),
      getCrmTopProdutos(periodo),
      getCrmRetencao(),
      getCrmAutomacao(periodo),
    ]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">CRM</h1>
          <p className="text-sm text-muted mt-0.5">Análise de atendimento e resultados</p>
        </div>

        {/* Seletor de período */}
        <div className="flex items-center gap-1 bg-surface-subtle border border-border rounded-lg p-1">
          {PERIODOS.map((d) => (
            <Link
              key={d}
              href={`/crm?periodo=${d}`}
              className={[
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                periodo === d
                  ? "bg-surface text-foreground shadow-sm border border-border"
                  : "text-muted hover:text-foreground",
              ].join(" ")}
            >
              {d}d
            </Link>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <KpiCards kpis={kpis} />

      {/* Pipeline — largura total */}
      <PipelineFunil pipeline={pipeline} />

      {/* Canal + Receita */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CanalStats canais={canais} />
        <ReceitaChart meses={meses} pagamentos={pagamentos} />
      </div>

      {/* Top Produtos + Retenção + Automação */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <TopProdutos produtos={produtos} />
        </div>
        <RetencaoStatsCard retencao={retencao} />
        <AutomacaoStatsCard automacao={automacao} />
      </div>
    </div>
  );
}
