import Link from "next/link";
import type { Pedido } from "@/lib/types";
import { EtapaBadge } from "@/components/ui/badge";

interface PedidoCardProps {
  pedido: Pedido;
  clienteNome?: string;
}

function formatMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const pagamentoIcon: Record<string, string> = {
  Pix: "⚡",
  "Cartão de Débito": "💳",
  "Cartão de Crédito": "💳",
  Dinheiro: "💵",
};

export function PedidoCard({ pedido, clienteNome }: PedidoCardProps) {
  return (
    <Link href={`/pedidos/${pedido.id}`} className="block group">
      <div className="bg-surface border border-border rounded-xl p-4 hover:border-brand/40 hover:shadow-sm transition-all">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {clienteNome && (
              <p className="font-semibold text-foreground text-sm truncate">{clienteNome}</p>
            )}
            <p className="text-xs text-muted mt-0.5">{formatData(pedido.criado_em)}</p>
          </div>
          <EtapaBadge etapa={pedido.status} />
        </div>

        {/* Items */}
        <ul className="mt-3 space-y-1">
          {pedido.itens.slice(0, 3).map((item, i) => (
            <li key={i} className="flex items-center justify-between text-sm">
              <span className="text-muted truncate flex-1 mr-2">
                {item.quantidade}× {item.nome}
              </span>
              <span className="text-foreground shrink-0">
                {formatMoeda(item.quantidade * item.preco_unitario)}
              </span>
            </li>
          ))}
          {pedido.itens.length > 3 && (
            <li className="text-xs text-subtle">+ {pedido.itens.length - 3} item(ns) a mais</li>
          )}
        </ul>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5 text-sm text-muted">
            <span>{pagamentoIcon[pedido.forma_pagamento] ?? "💰"}</span>
            <span>{pedido.forma_pagamento}</span>
          </div>
          <p className="font-semibold text-foreground text-sm">{formatMoeda(pedido.total)}</p>
        </div>
      </div>
    </Link>
  );
}
