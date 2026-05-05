"use client";

import { useState } from "react";
import type { Pedido, Etapa } from "@/lib/types";
import { etapaLabels } from "@/components/ui/badge";
import { PedidoCard } from "./pedido-card";

interface PedidosListProps {
  pedidos: Pedido[];
  clienteNomes: Record<string, string>;
}

const STATUS_PEDIDO: Etapa[] = [
  "fechamento", "pedido_gerado", "separacao", "em_rota", "pos_venda",
];

export function PedidosList({ pedidos, clienteNomes }: PedidosListProps) {
  const [filtroStatus, setFiltroStatus] = useState<Etapa | "">("");

  const filtrados = filtroStatus
    ? pedidos.filter((p) => p.status === filtroStatus)
    : pedidos;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFiltroStatus("")}
          className={[
            "h-8 px-3 rounded-lg text-xs font-medium border transition-colors",
            !filtroStatus
              ? "bg-brand text-white border-brand"
              : "bg-surface border-border text-muted hover:bg-surface-subtle",
          ].join(" ")}
        >
          Todos ({pedidos.length})
        </button>
        {STATUS_PEDIDO.map((s) => {
          const count = pedidos.filter((p) => p.status === s).length;
          if (count === 0) return null;
          return (
            <button
              key={s}
              onClick={() => setFiltroStatus(s)}
              className={[
                "h-8 px-3 rounded-lg text-xs font-medium border transition-colors",
                filtroStatus === s
                  ? "bg-brand text-white border-brand"
                  : "bg-surface border-border text-muted hover:bg-surface-subtle",
              ].join(" ")}
            >
              {etapaLabels[s]} ({count})
            </button>
          );
        })}
      </div>

      {/* Count */}
      <p className="text-xs text-muted">
        {filtrados.length} de {pedidos.length} pedidos
      </p>

      {/* Grid */}
      {filtrados.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">Nenhum pedido encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map((p) => (
            <PedidoCard key={p.id} pedido={p} clienteNome={clienteNomes[p.cliente_id]} />
          ))}
        </div>
      )}
    </div>
  );
}
