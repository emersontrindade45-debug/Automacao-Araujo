import { PrecosPageClient } from "@/components/precos/precos-page-client";
import { getAtualizacoesPreco, countPrecosPendentes } from "@/lib/supabase/queries/precos";
import { getProdutos } from "@/lib/supabase/queries/produtos";

export const metadata = { title: "Preços – Araujo Hub" };

export default async function PrecosPage() {
  const [atualizacoes, pendentes, produtos] = await Promise.all([
    getAtualizacoesPreco(),
    countPrecosPendentes(),
    getProdutos(),
  ]);

  return (
    <PrecosPageClient
      atualizacoes={atualizacoes}
      pendentes={pendentes}
      produtos={produtos}
    />
  );
}
