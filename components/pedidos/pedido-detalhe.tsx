"use client";

import { useState } from "react";
import type { Pedido, ItemPedido, Etapa } from "@/lib/types";
import { EtapaBadge, etapaLabels } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

interface PedidoDetalheProps {
  pedido: Pedido;
  clienteNome?: string;
}

function formatMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const PROXIMA_ETAPA: Partial<Record<Etapa, Etapa>> = {
  fechamento: "pedido_gerado",
  pedido_gerado: "separacao",
  separacao: "em_rota",
  em_rota: "pos_venda",
};

export function PedidoDetalhe({ pedido, clienteNome }: PedidoDetalheProps) {
  const [itens, setItens] = useState<ItemPedido[]>(pedido.itens);
  const [status, setStatus] = useState<Etapa>(pedido.status);
  const [confirmado, setConfirmado] = useState(false);

  const total = itens.reduce((acc, item) => acc + item.quantidade * item.preco_unitario, 0);
  const proximaEtapa = PROXIMA_ETAPA[status];

  function updateQuantidade(index: number, valor: number) {
    setItens((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantidade: Math.max(0.1, valor) } : item))
    );
  }

  function removerItem(index: number) {
    setItens((prev) => prev.filter((_, i) => i !== index));
  }

  function confirmarPedido() {
    setConfirmado(true);
    if (proximaEtapa) setStatus(proximaEtapa);
  }

  return (
    <div className="space-y-5">
      {/* Status */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs text-subtle uppercase tracking-wide mb-1">Status</p>
              <EtapaBadge etapa={status} />
            </div>
            <div>
              <p className="text-xs text-subtle uppercase tracking-wide mb-1">Endereço de entrega</p>
              <p className="text-sm text-foreground">{pedido.endereco_entrega}</p>
            </div>
            <div>
              <p className="text-xs text-subtle uppercase tracking-wide mb-1">Pagamento</p>
              <p className="text-sm text-foreground">{pedido.forma_pagamento}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Itens */}
      <Card>
        <CardHeader>
          <CardTitle>Itens do pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {itens.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.nome}</p>
                  <p className="text-xs text-muted mt-0.5">{formatMoeda(item.preco_unitario)} / un</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => updateQuantidade(i, item.quantidade - (item.quantidade < 2 ? 0.1 : 1))}
                    className="h-7 w-7 rounded border border-border text-muted hover:bg-surface-subtle flex items-center justify-center text-sm transition-colors"
                    disabled={confirmado}
                  >
                    −
                  </button>
                  <span className="text-sm font-medium text-foreground w-10 text-center">
                    {item.quantidade % 1 === 0 ? item.quantidade : item.quantidade.toFixed(1)}
                  </span>
                  <button
                    onClick={() => updateQuantidade(i, item.quantidade + (item.quantidade < 1 ? 0.1 : 1))}
                    className="h-7 w-7 rounded border border-border text-muted hover:bg-surface-subtle flex items-center justify-center text-sm transition-colors"
                    disabled={confirmado}
                  >
                    +
                  </button>
                </div>
                <div className="text-sm font-semibold text-foreground w-24 text-right shrink-0">
                  {formatMoeda(item.quantidade * item.preco_unitario)}
                </div>
                {!confirmado && (
                  <button
                    onClick={() => removerItem(i)}
                    className="text-muted hover:text-danger transition-colors p-1"
                    aria-label="Remover item"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <span className="text-sm font-semibold text-foreground">Total</span>
          <span className="text-lg font-bold text-foreground">{formatMoeda(total)}</span>
        </CardFooter>
      </Card>

      {/* Actions */}
      {!confirmado && proximaEtapa && (
        <div className="flex justify-end">
          <Button variant="primary" onClick={confirmarPedido}>
            Confirmar e avançar para {etapaLabels[proximaEtapa]}
          </Button>
        </div>
      )}
      {confirmado && (
        <div className="flex items-center gap-2 text-success text-sm font-medium">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Pedido confirmado e avançado para {etapaLabels[status]}
        </div>
      )}
    </div>
  );
}
