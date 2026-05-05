import { notFound } from "next/navigation";
import Link from "next/link";
import { mockPedidos, clienteNomes } from "@/lib/mock/pedidos";
import { mockClientes } from "@/lib/mock/clientes";
import { PedidoDetalhe } from "@/components/pedidos/pedido-detalhe";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const pedido = mockPedidos.find((p) => p.id === id);
  const nome = pedido ? (clienteNomes[pedido.cliente_id] ?? "Pedido") : "Pedido";
  return { title: `${nome} – Pedido – Araujo Hub` };
}

export default async function PedidoDetalhePage({ params }: Props) {
  const { id } = await params;
  const pedido = mockPedidos.find((p) => p.id === id);
  if (!pedido) notFound();

  const clienteNome = clienteNomes[pedido.cliente_id];
  const cliente = mockClientes.find((c) => c.id === pedido.cliente_id);

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link href="/pedidos" className="hover:text-foreground transition-colors">Pedidos</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{clienteNome ?? "Pedido"}</span>
      </div>

      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Pedido de {clienteNome ?? "cliente"}
          </h1>
          {cliente && (
            <Link href={`/clientes/${cliente.id}`} className="text-sm text-brand hover:underline mt-0.5 inline-block">
              Ver perfil do cliente →
            </Link>
          )}
        </div>
      </div>

      <PedidoDetalhe pedido={pedido} clienteNome={clienteNome} />
    </div>
  );
}
