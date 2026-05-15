import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountSecurityForm } from "./account-security-form";

export const metadata = { title: "Conta e segurança – Araujo Hub" };

export default async function ContaConfigPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const nomeExibicao =
    (user.user_metadata?.nome as string | undefined)?.trim() ||
    user.email.split("@")[0] ||
    "Usuário";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Conta e segurança</h2>
        <p className="text-sm text-muted mt-0.5">Dados da sessão atual e alteração de senha.</p>
      </div>
      <AccountSecurityForm email={user.email} nomeExibicao={nomeExibicao} />
    </div>
  );
}
