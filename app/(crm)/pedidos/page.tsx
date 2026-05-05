import { PedidosList } from "@/components/pedidos/pedidos-list";
import { mockPedidos, clienteNomes } from "@/lib/mock/pedidos";

export const metadata = { title: "Pedidos – Araujo Hub" };

export default function PedidosPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Pedidos</h1>
        <p className="text-sm text-muted mt-0.5">Acompanhe todos os pedidos em andamento</p>
      </div>
      <PedidosList pedidos={mockPedidos} clienteNomes={clienteNomes} />
    </div>
  );
}
