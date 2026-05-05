import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getConfigFollowUp } from "./actions";
import { ConfigForm } from "./config-form";

export const metadata = { title: "Configurações – Araujo Hub" };

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user?.app_metadata?.papel !== "admin") {
    redirect("/kanban");
  }

  const config = await getConfigFollowUp();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Configurações</h1>
        <p className="text-sm text-muted mt-0.5">Parâmetros do sistema — acesso restrito a administradores</p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">Follow-up automático</h2>
          <p className="text-sm text-muted mt-0.5">
            Configure quando e como o sistema aciona follow-ups para leads frios.
          </p>
        </div>
        <ConfigForm config={config} />
      </div>
    </div>
  );
}
