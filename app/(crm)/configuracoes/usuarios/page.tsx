import { createClient } from "@/lib/supabase/server";
import { AccessRestricted } from "@/components/configuracoes/access-restricted";
import { listarUsuarios } from "@/lib/supabase/queries/usuarios";
import { ConvidarForm } from "./convite-form";
import { UsuariosList } from "./usuarios-list";

export const metadata = { title: "Usuários e papéis – Araujo Hub" };

export default async function UsuariosConfigPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (user?.app_metadata?.papel !== "admin") {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Usuários e papéis</h2>
          <p className="text-sm text-muted mt-0.5">Convites e permissões (RBAC).</p>
        </div>
        <AccessRestricted descricao="Somente administradores gerenciam usuários e papéis de acesso ao CRM." />
      </div>
    );
  }

  const usuarios = await listarUsuarios();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Usuários e papéis</h2>
        <p className="text-sm text-muted mt-0.5">
          Dois níveis: <strong>Admin</strong> (configurações e catálogo) e <strong>Atendimento</strong> (CRM).
        </p>
      </div>

      <ConvidarForm />

      <UsuariosList usuarios={usuarios} currentUserId={user.id} />
    </div>
  );
}
