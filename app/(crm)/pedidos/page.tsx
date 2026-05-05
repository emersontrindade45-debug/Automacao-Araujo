import { PedidosList } from "@/components/pedidos/pedidos-list";
import { getPedidos } from "@/lib/supabase/queries/pedidos";

export const metadata = { title: "Pedidos – Araujo Hub" };

export default async function PedidosPage() {
  const pedidosRaw = await getPedidos();

  const pedidos = pedidosRaw.map(({ clientes, ...p }) => p);
  const clienteNomes = Object.fromEntries(
    pedidosRaw.map((p) => [p.cliente_id, p.clientes?.nome ?? ""])
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Pedidos</h1>
        <p className="text-sm text-muted mt-0.5">Acompanhe todos os pedidos em andamento</p>
      </div>
      <PedidosList pedidos={pedidos} clienteNomes={clienteNomes} />
    </div>
  );
}
