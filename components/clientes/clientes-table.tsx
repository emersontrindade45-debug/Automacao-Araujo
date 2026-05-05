"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { Cliente, CanalOrigem, Etapa } from "@/lib/types";
import { EtapaBadge, CanalBadge, etapaLabels, canalLabels } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input, Select } from "@/components/ui/input";

interface ClientesTableProps {
  clientes: Cliente[];
}

function formatTelefone(tel: string) {
  if (tel.length === 11) return `(${tel.slice(0, 2)}) ${tel.slice(2, 7)}-${tel.slice(7)}`;
  return tel;
}

function formatData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

const ETAPAS: Etapa[] = [
  "novo", "atendimento", "fechamento", "pedido_gerado",
  "separacao", "em_rota", "pos_venda", "follow_up", "marketing",
];

const CANAIS: CanalOrigem[] = ["whatsapp", "instagram", "landpage"];

export function ClientesTable({ clientes }: ClientesTableProps) {
  const [busca, setBusca] = useState("");
  const [filtroCanal, setFiltroCanal] = useState<CanalOrigem | "">("");
  const [filtroEtapa, setFiltroEtapa] = useState<Etapa | "">("");
  const [expandido, setExpandido] = useState<string | null>(null);

  const filtrados = clientes.filter((c) => {
    const matchBusca =
      !busca ||
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.telefone.includes(busca);
    const matchCanal = !filtroCanal || c.canal_origem === filtroCanal;
    const matchEtapa = !filtroEtapa || c.etapa_atual === filtroEtapa;
    return matchBusca && matchCanal && matchEtapa;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nome ou telefone…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <select
          value={filtroCanal}
          onChange={(e) => setFiltroCanal(e.target.value as CanalOrigem | "")}
          className="h-9 px-3 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand min-w-36"
        >
          <option value="">Todos os canais</option>
          {CANAIS.map((c) => (
            <option key={c} value={c}>{canalLabels[c]}</option>
          ))}
        </select>
        <select
          value={filtroEtapa}
          onChange={(e) => setFiltroEtapa(e.target.value as Etapa | "")}
          className="h-9 px-3 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand min-w-44"
        >
          <option value="">Todas as etapas</option>
          {ETAPAS.map((e) => (
            <option key={e} value={e}>{etapaLabels[e]}</option>
          ))}
        </select>
      </div>

      {/* Count */}
      <p className="text-xs text-muted">
        {filtrados.length} de {clientes.length} clientes
      </p>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-subtle">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Cliente</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide hidden sm:table-cell">Telefone</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide hidden md:table-cell">Canal</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Etapa</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide hidden lg:table-cell">Criado em</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-muted text-sm">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
            {filtrados.map((c) => (
              <React.Fragment key={c.id}>
                <tr
                  className="border-b border-border last:border-0 hover:bg-surface-subtle transition-colors cursor-pointer"
                  onClick={() => setExpandido(expandido === c.id ? null : c.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={c.nome} size="sm" className="shrink-0" />
                      <span className="font-medium text-foreground">{c.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted hidden sm:table-cell">{formatTelefone(c.telefone)}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <CanalBadge canal={c.canal_origem} />
                  </td>
                  <td className="px-4 py-3">
                    <EtapaBadge etapa={c.etapa_atual} />
                  </td>
                  <td className="px-4 py-3 text-muted hidden lg:table-cell">{formatData(c.criado_em)}</td>
                  <td className="px-4 py-3">
                    <svg
                      className={["h-4 w-4 text-muted transition-transform", expandido === c.id ? "rotate-180" : ""].join(" ")}
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </td>
                </tr>
                {expandido === c.id && (
                  <tr className="bg-surface-subtle border-b border-border">
                    <td colSpan={6} className="px-6 py-3">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex gap-6 text-sm">
                          <div>
                            <span className="text-muted text-xs uppercase tracking-wide">Último contato</span>
                            <p className="text-foreground font-medium mt-0.5">{formatData(c.atualizado_em)}</p>
                          </div>
                          <div className="sm:hidden">
                            <span className="text-muted text-xs uppercase tracking-wide">Telefone</span>
                            <p className="text-foreground font-medium mt-0.5">{formatTelefone(c.telefone)}</p>
                          </div>
                          <div className="md:hidden">
                            <span className="text-muted text-xs uppercase tracking-wide">Canal</span>
                            <div className="mt-0.5"><CanalBadge canal={c.canal_origem} /></div>
                          </div>
                        </div>
                        <Link
                          href={`/clientes/${c.id}`}
                          className="text-xs text-brand font-medium hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Ver perfil completo →
                        </Link>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
