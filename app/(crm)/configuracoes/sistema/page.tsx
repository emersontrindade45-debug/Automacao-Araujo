import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AccessRestricted } from "@/components/configuracoes/access-restricted";
import { AdminPlaceholder } from "@/components/configuracoes/admin-placeholder";

export const metadata = { title: "Sistema e saúde – Araujo Hub" };

export default async function SistemaConfigPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.app_metadata?.papel !== "admin") {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Sistema e saúde</h2>
          <p className="text-sm text-muted mt-0.5">Monitoramento e versão.</p>
        </div>
        <AccessRestricted descricao="Informações operacionais do ambiente são visíveis apenas para administradores." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Sistema e saúde</h2>
        <p className="text-sm text-muted mt-0.5">Deploy, health check e checklist de go-live.</p>
      </div>
      <AdminPlaceholder
        titulo="Operação"
        descricao="Integração com logs do Vercel, variáveis de ambiente e banco de produção — ver docs/PLAN.md (M6)."
      />
      <Link
        href="/api/health"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex text-sm font-medium text-brand hover:text-brand-600 transition-colors"
      >
        Abrir /api/health →
      </Link>
    </div>
  );
}
