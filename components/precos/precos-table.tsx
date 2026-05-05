"use client";

import { useState } from "react";
import type { StatusPreco } from "@/lib/types";
import type { AtualizacaoPreco } from "@/lib/mock/produtos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PrecosTableProps {
  atualizacoes: AtualizacaoPreco[];
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

const statusLabel: Record<StatusPreco, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};

const statusVariant: Record<StatusPreco, string> = {
  pendente: "warning",
  aprovado: "success",
  rejeitado: "danger",
};

export function PrecosTable({ atualizacoes: inicial }: PrecosTableProps) {
  const [items, setItems] = useState<AtualizacaoPreco[]>(inicial);
  const [filtro, setFiltro] = useState<StatusPreco | "">("");

  const filtrados = filtro ? items.filter((i) => i.status === filtro) : items;
  const pendentes = items.filter((i) => i.status === "pendente").length;

  function aprovar(id: string) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "aprovado" as StatusPreco } : i))
    );
  }

  function rejeitar(id: string) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "rejeitado" as StatusPreco } : i))
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      {pendentes > 0 && (
        <div className="flex items-center gap-2 p-3 bg-warning-bg border border-[var(--warning-border)] rounded-lg text-sm text-warning">
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span><strong>{pendentes}</strong> atualização(ões) de preço aguardando aprovação</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(["", "pendente", "aprovado", "rejeitado"] as (StatusPreco | "")[]).map((s) => {
          const count = s ? items.filter((i) => i.status === s).length : items.length;
          return (
            <button
              key={s}
              onClick={() => setFiltro(s)}
              className={[
                "h-8 px-3 rounded-lg text-xs font-medium border transition-colors",
                filtro === s
                  ? "bg-brand text-white border-brand"
                  : "bg-surface border-border text-muted hover:bg-surface-subtle",
              ].join(" ")}
            >
              {s ? statusLabel[s] : "Todos"} ({count})
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-subtle">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Produto</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide hidden sm:table-cell">Preço atual</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Novo preço</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide hidden md:table-cell">Solicitado por</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide hidden lg:table-cell">Data</th>
              <th className="px-4 py-3 w-32 text-right text-xs font-semibold text-muted uppercase tracking-wide">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-muted text-sm">
                  Nenhuma atualização encontrada.
                </td>
              </tr>
            )}
            {filtrados.map((item) => {
              const variacao = ((item.preco_novo - item.preco_atual) / item.preco_atual) * 100;
              return (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface-subtle transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{item.produto_nome}</td>
                  <td className="px-4 py-3 text-muted hidden sm:table-cell">{formatMoeda(item.preco_atual)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-foreground">{formatMoeda(item.preco_novo)}</span>
                      <span className={["text-xs font-medium", variacao > 0 ? "text-danger" : "text-success"].join(" ")}>
                        {variacao > 0 ? "+" : ""}{variacao.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted hidden md:table-cell">{item.solicitado_por}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[item.status] as "warning" | "success" | "danger"}>
                      {statusLabel[item.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted hidden lg:table-cell text-xs">{formatData(item.criado_em)}</td>
                  <td className="px-4 py-3 text-right">
                    {item.status === "pendente" && (
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => rejeitar(item.id)}>
                          Rejeitar
                        </Button>
                        <Button size="sm" variant="primary" onClick={() => aprovar(item.id)}>
                          Aprovar
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
