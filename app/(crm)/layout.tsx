import { Shell } from "@/components/layout/shell";
import { normalizePapel } from "@/lib/auth/papel";
import { countPrecosPendentes } from "@/lib/supabase/queries/precos";
import { createClient } from "@/lib/supabase/server";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  // app_metadata (papel) lives in the JWT — use getSession() to read it
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  const precosPendentes = await countPrecosPendentes();

  const userName = user?.user_metadata?.nome ?? user?.email?.split("@")[0] ?? "Usuário";
  const userPapel = normalizePapel(user?.app_metadata?.papel);
  const isDev = !!process.env.DEV_EMAIL && user?.email === process.env.DEV_EMAIL;

  return (
    <Shell userName={userName} userPapel={userPapel} precosPendentes={precosPendentes} isDev={isDev}>
      {children}
    </Shell>
  );
}
