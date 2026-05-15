import { SettingsNav } from "@/components/configuracoes/settings-nav";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Configurações – Araujo Hub" };

export default async function ConfiguracoesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = user?.app_metadata?.papel === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Configurações</h1>
        <p className="text-sm text-muted mt-0.5">
          Conta, segurança e parâmetros do sistema — algumas seções são exclusivas de administradores.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <SettingsNav isAdmin={isAdmin} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
