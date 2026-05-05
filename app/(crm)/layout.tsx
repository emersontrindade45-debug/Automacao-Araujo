import { Shell } from "@/components/layout/shell";
import { countPrecosPendentes } from "@/lib/supabase/queries/precos";
import { createClient } from "@/lib/supabase/server";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const precosPendentes = await countPrecosPendentes();

  const userName = user?.user_metadata?.nome ?? user?.email?.split("@")[0] ?? "Usuário";
  const userPapel = (user?.app_metadata?.papel ?? "atendimento") as string;

  return (
    <Shell userName={userName} userPapel={userPapel} precosPendentes={precosPendentes}>
      {children}
    </Shell>
  );
}
