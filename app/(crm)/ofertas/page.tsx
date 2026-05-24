import { OfertasTable } from "@/components/ofertas/ofertas-table";
import { getOfertasEKits } from "@/lib/supabase/queries/produtos";

export const metadata = { title: "Ofertas e Kits – Araujo Hub" };

export default async function OfertasPage() {
  const itens = await getOfertasEKits();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Ofertas e Kits</h1>
        <p className="text-sm text-muted mt-1">
          Gerencie as ofertas e kits disponíveis para os clientes.
        </p>
      </div>
      <OfertasTable itens={itens} />
    </div>
  );
}
