import { createClient } from "@/lib/supabase/server";
import { AccessRestricted } from "@/components/configuracoes/access-restricted";
import { AdminPlaceholder } from "@/components/configuracoes/admin-placeholder";

export const metadata = { title: "Canais de entrada – Araujo Hub" };

export default async function CanaisConfigPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (user?.app_metadata?.papel !== "admin") {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Canais de entrada</h2>
          <p className="text-sm text-muted mt-0.5">Landpage, WhatsApp e Instagram.</p>
        </div>
        <AccessRestricted descricao="Apenas administradores visualizam e ajustam parâmetros dos canais de entrada." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Canais de entrada</h2>
        <p className="text-sm text-muted mt-0.5">Landpage, WhatsApp Business e Instagram Messaging.</p>
      </div>
      <AdminPlaceholder
        titulo="Canais"
        descricao="URLs de webhook, tokens de verificação e mensagens de boas-vindas por canal. Parte das credenciais continua em variáveis de ambiente (Vercel) por segurança."
      />
    </div>
  );
}
