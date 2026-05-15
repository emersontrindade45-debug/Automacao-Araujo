import { createClient } from "@/lib/supabase/server";
import { AccessRestricted } from "@/components/configuracoes/access-restricted";
import { getConfigFollowUp } from "../actions";
import { ConfigForm } from "../config-form";

export const metadata = { title: "Follow-up automático – Araujo Hub" };

export default async function FollowUpConfigPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (user?.app_metadata?.papel !== "admin") {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Follow-up automático</h2>
          <p className="text-sm text-muted mt-0.5">Parâmetros da campanha de reativação de leads.</p>
        </div>
        <AccessRestricted
          descricao="Apenas administradores podem alterar dias de inatividade, tentativas e mensagem padrão do follow-up. Se precisar de mudanças, peça a um admin."
        />
      </div>
    );
  }

  const config = await getConfigFollowUp();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Follow-up automático</h2>
        <p className="text-sm text-muted mt-0.5">
          Configure quando e como o sistema aciona follow-ups para leads frios (cron + N8n).
        </p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 space-y-6">
        <ConfigForm config={config} />
      </div>
    </div>
  );
}
