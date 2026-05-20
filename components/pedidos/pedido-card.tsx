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

function formatNumeroPedido(numero: number) {
  return `#${String(numero).padStart(6, "0")}`;
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
            <p className="text-xs font-semibold text-brand">
              Pedido {formatNumeroPedido(pedido.numero_pedido)}
            </p>
            {clienteNome && (
              <p className="font-semibold text-foreground text-sm truncate mt-0.5">{clienteNome}</p>
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

        {/* Endereço */}
        {pedido.endereco_entrega && (
          <div className="flex items-start gap-1.5 mt-3 text-xs text-muted">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="w-3.5 h-3.5 shrink-0 mt-px text-subtle"
            >
              <path
                fillRule="evenodd"
                d="M8 1a5 5 0 0 0-5 5c0 3.188 2.718 6.274 4.472 8.096a.75.75 0 0 0 1.056 0C10.282 12.274 13 9.188 13 6a5 5 0 0 0-5-5Zm0 6.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
                clipRule="evenodd"
              />
            </svg>
            <span className="line-clamp-2 leading-snug">{pedido.endereco_entrega}</span>
          </div>
        )}

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
