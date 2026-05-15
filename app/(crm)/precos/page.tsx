import { PrecosPageClient } from "@/components/precos/precos-page-client";
import { getAtualizacoesPreco, countPrecosPendentes } from "@/lib/supabase/queries/precos";
import { getProdutos } from "@/lib/supabase/queries/produtos";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Preços – Araujo Hub" };

export default async function PrecosPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const isAdmin = session?.user?.app_metadata?.papel === "admin";

  const [atualizacoes, pendentes, produtos] = await Promise.all([
    isAdmin ? getAtualizacoesPreco() : Promise.resolve([]),
    isAdmin ? countPrecosPendentes() : Promise.resolve(0),
    getProdutos(),
  ]);

  return (
    <PrecosPageClient
      atualizacoes={atualizacoes}
      pendentes={pendentes}
      produtos={produtos}
      isAdmin={isAdmin}
    />
  );
}
