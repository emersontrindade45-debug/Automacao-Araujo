import Link from "next/link";
import { redirect } from "next/navigation";
import { isDevUser } from "@/lib/auth/papel";
import { getErros } from "./actions";
import { ErrosTab } from "./erros-tab";
import { OpenAITab } from "./openai-tab";

export const metadata = { title: "Manutenção – Araujo Hub" };

const STATUS_OPTS = ["todos", "pendente", "resolvido_ia", "resolvido_dev", "sem_solucao"] as const;
const TABS = ["erros", "openai"] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  erros: "Erros",
  openai: "Tokens OpenAI",
};

export default async function ManutencaoPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string }>;
}) {
  if (!(await isDevUser())) redirect("/kanban");

  const params = await searchParams;
  const tab: Tab = TABS.includes(params.tab as Tab) ? (params.tab as Tab) : "erros";
  const statusFiltro = STATUS_OPTS.includes(params.status as typeof STATUS_OPTS[number])
    ? params.status!
    : "todos";

  const erros = tab === "erros" ? await getErros(statusFiltro) : [];

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Manutenção</h1>
        <p className="text-sm text-muted mt-0.5">Monitoramento de erros e consumo de tokens OpenAI</p>
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
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
            {TAB_LABELS[t]}
          </Link>
        ))}
      </div>

      {tab === "erros" && <ErrosTab erros={erros} statusFiltro={statusFiltro} />}
      {tab === "openai" && <OpenAITab />}
    </div>
  );
}
