import { createClient } from "@/lib/supabase/server";
import { AccessRestricted } from "@/components/configuracoes/access-restricted";
import { AdminPlaceholder } from "@/components/configuracoes/admin-placeholder";

export const metadata = { title: "Handoff e automação – Araujo Hub" };

export default async function AutomacaoConfigPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (user?.app_metadata?.papel !== "admin") {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Handoff e automação</h2>
          <p className="text-sm text-muted mt-0.5">N8n e regras de encaminhamento.</p>
        </div>
        <AccessRestricted descricao="Somente administradores acessam referências e futuras chaves de integração com o N8n." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Handoff e automação</h2>
        <p className="text-sm text-muted mt-0.5">Orquestração N8n e payloads de handoff para o Hub.</p>
      </div>
      <AdminPlaceholder
        titulo="N8n e handoff"
        descricao="Resumo das regras (ambiguidade → atendimento, pedido confirmado → separação, etc.) e links para docs/N8N.md. Rotação de segredos permanece no painel do Vercel."
      />
    </div>
  );
}
