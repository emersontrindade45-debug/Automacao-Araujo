import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AccessRestricted } from "@/components/configuracoes/access-restricted";
import { AdminPlaceholder } from "@/components/configuracoes/admin-placeholder";

export const metadata = { title: "Preços e catálogo – Araujo Hub" };

export default async function PrecosConfigPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (user?.app_metadata?.papel !== "admin") {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Preços e catálogo</h2>
          <p className="text-sm text-muted mt-0.5">Políticas de atualização e catálogo.</p>
        </div>
        <AccessRestricted descricao="Políticas administrativas de preço e catálogo ficam restritas a administradores." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Preços e catálogo</h2>
        <p className="text-sm text-muted mt-0.5">Aprovação de preços vindos do WhatsApp e gestão de produtos.</p>
      </div>
      <AdminPlaceholder
        titulo="Políticas de preço"
        descricao="Regras adicionais de aprovação, importação em massa e alertas. A fila diária de aprovação continua em Preços no menu principal."
      />
      <Link
        href="/precos"
        className="inline-flex text-sm font-medium text-brand hover:text-brand-600 transition-colors"
      >
        Abrir fila de preços →
      </Link>
    </div>
  );
}
