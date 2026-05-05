import { notFound } from "next/navigation";
import Link from "next/link";
import { getPedidoById } from "@/lib/supabase/queries/pedidos";
import { PedidoDetalhe } from "@/components/pedidos/pedido-detalhe";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  try {
    const pedido = await getPedidoById(id);
    const nome = pedido.clientes?.nome ?? "Pedido";
    return { title: `${nome} – Pedido – Araujo Hub` };
  } catch {
    return { title: "Pedido – Araujo Hub" };
  }
}

export default async function PedidoDetalhePage({ params }: Props) {
  const { id } = await params;

  let pedido;
  try {
    pedido = await getPedidoById(id);
  } catch {
    notFound();
  }

  const clienteNome = pedido.clientes?.nome ?? "cliente";

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link href="/pedidos" className="hover:text-foreground transition-colors">Pedidos</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{clienteNome}</span>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Pedido de {clienteNome}
          </h1>
          <Link href={`/clientes/${pedido.cliente_id}`} className="text-sm text-brand hover:underline mt-0.5 inline-block">
            Ver perfil do cliente →
          </Link>
        </div>
      </div>

      <PedidoDetalhe pedido={pedido} clienteNome={clienteNome} />
    </div>
  );
}
