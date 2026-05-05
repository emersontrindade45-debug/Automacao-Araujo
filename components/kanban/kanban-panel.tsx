"use client";

import type { Cliente } from "@/lib/types";
import { EtapaBadge, CanalBadge, etapaLabels } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { mockHistorico } from "@/lib/mock/clientes";
import type { Etapa } from "@/lib/types";

const ETAPAS: Etapa[] = [
  "novo", "atendimento", "fechamento", "pedido_gerado",
  "separacao", "em_rota", "pos_venda", "follow_up", "marketing",
];

interface KanbanPanelProps {
  cliente: Cliente;
  onClose: () => void;
  onMoverEtapa: (clienteId: string, novaEtapa: Etapa) => void;
}

function formatData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatTelefone(tel: string) {
  if (tel.length === 11) return `(${tel.slice(0, 2)}) ${tel.slice(2, 7)}-${tel.slice(7)}`;
  return tel;
}

export function KanbanPanel({ cliente, onClose, onMoverEtapa }: KanbanPanelProps) {
  const historico = mockHistorico[cliente.id] ?? [];
  const etapaIndex = ETAPAS.indexOf(cliente.etapa_atual);
  const proximaEtapa = etapaIndex < ETAPAS.length - 1 ? ETAPAS[etapaIndex + 1] : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <aside className="fixed right-0 top-0 h-full w-full max-w-sm bg-surface border-l border-border shadow-xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <Avatar name={cliente.nome} size="md" />
            <div>
              <p className="font-semibold text-foreground text-sm">{cliente.nome}</p>
              <p className="text-xs text-muted">{formatTelefone(cliente.telefone)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors p-1 rounded"
            aria-label="Fechar painel"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Info */}
          <div className="flex flex-wrap gap-2">
            <EtapaBadge etapa={cliente.etapa_atual} />
            <CanalBadge canal={cliente.canal_origem} />
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-subtle uppercase tracking-wide mb-1">Criado em</p>
              <p className="text-foreground">{formatData(cliente.criado_em)}</p>
            </div>
            <div>
              <p className="text-xs text-subtle uppercase tracking-wide mb-1">Atualizado</p>
              <p className="text-foreground">{formatData(cliente.atualizado_em)}</p>
            </div>
          </div>

          {/* Histórico */}
          <div>
            <p className="text-xs text-subtle uppercase tracking-wide mb-3">Histórico</p>
            {historico.length === 0 ? (
              <p className="text-sm text-muted italic">Nenhum registro ainda.</p>
            ) : (
              <ol className="relative border-l border-border space-y-4 pl-4">
                {historico.map((item, i) => (
                  <li key={i} className="relative">
                    <div className="absolute -left-[1.35rem] top-1 h-2.5 w-2.5 rounded-full bg-brand ring-2 ring-surface" />
                    <p className="text-xs text-subtle mb-0.5">{formatData(item.data)}</p>
                    <p className="text-sm text-foreground">{item.texto}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-border space-y-2 shrink-0">
          {proximaEtapa && (
            <Button
              variant="primary"
              className="w-full"
              onClick={() => onMoverEtapa(cliente.id, proximaEtapa)}
            >
              Avançar para {etapaLabels[proximaEtapa]}
            </Button>
          )}
          <Button
            variant="ghost"
            className="w-full text-brand"
            onClick={() => {}}
          >
            Fazer Handoff para Atendente
          </Button>
        </div>
      </aside>
    </>
  );
}
