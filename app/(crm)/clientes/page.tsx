import { ClientesTable } from "@/components/clientes/clientes-table";
import { getClientes } from "@/lib/supabase/queries/clientes";

export const metadata = { title: "Clientes – Araujo Hub" };

export default async function ClientesPage() {
  const clientes = await getClientes();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Clientes</h1>
        <p className="text-sm text-muted mt-0.5">Gerencie todos os contatos do CRM</p>
      </div>
      <ClientesTable clientes={clientes} />
    </div>
  );
}
