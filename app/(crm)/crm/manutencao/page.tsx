import Link from "next/link";
import { redirect } from "next/navigation";
import { isDevUser } from "@/lib/auth/papel";
import { getErros, getResumoTokens } from "./actions";
import { ErrosTab } from "./erros-tab";
import { TokensTab } from "./tokens-tab";

export const metadata = { title: "Manutenção – Araujo Hub" };

const PERIODOS = ["24h", "7d", "15d", "30d"] as const;
const STATUS_OPTS = ["todos", "pendente", "resolvido_ia", "resolvido_dev", "sem_solucao"] as const;

export default async function ManutencaoPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string; period?: string }>;
}) {
  if (!(await isDevUser())) redirect("/kanban");

  const params = await searchParams;
  const tab = params.tab === "tokens" ? "tokens" : "erros";
  const statusFiltro = STATUS_OPTS.includes(params.status as typeof STATUS_OPTS[number])
    ? params.status!
    : "todos";
  const period = PERIODOS.includes(params.period as typeof PERIODOS[number])
    ? params.period!
    : "24h";

  const [erros, resumoTokens] = await Promise.all([
    getErros(statusFiltro),
    getResumoTokens(period),
  ]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Manutenção</h1>
        <p className="text-sm text-muted mt-0.5">Monitoramento de erros e consumo de tokens OpenAI</p>
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b border-border">
        {(["erros", "tokens"] as const).map((t) => (
          <Link
            key={t}
            href={`/crm/manutencao?tab=${t}`}
            className={[
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t
                ? "border-brand text-brand"
                : "border-transparent text-muted hover:text-foreground",
            ].join(" ")}
          >
            {t === "erros" ? "Erros" : "Tokens OpenAI"}
          </Link>
        ))}
      </div>

      {tab === "erros" ? (
        <ErrosTab erros={erros} statusFiltro={statusFiltro} />
      ) : (
        <TokensTab resumo={resumoTokens} period={period} periodos={[...PERIODOS]} />
      )}
    </div>
  );
}
