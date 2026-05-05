import { ClientesTable } from "@/components/clientes/clientes-table";
import { mockClientes } from "@/lib/mock/clientes";

export const metadata = { title: "Clientes – Araujo Hub" };

export default function ClientesPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Clientes</h1>
        <p className="text-sm text-muted mt-0.5">Gerencie todos os contatos do CRM</p>
      </div>
      <ClientesTable clientes={mockClientes} />
    </div>
  );
}
