"use client";

import type { Cliente, Etapa } from "@/lib/types";
import { EtapaBadge, CanalBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";

interface KanbanCardProps {
  cliente: Cliente;
  onClick: (cliente: Cliente) => void;
  onDragStart: (e: React.DragEvent, clienteId: string, fromEtapa: Etapa) => void;
}

function tempoNaEtapa(atualizado_em: string): string {
  const diff = Date.now() - new Date(atualizado_em).getTime();
  const horas = Math.floor(diff / 1000 / 60 / 60);
  if (horas < 1) return "< 1h";
  if (horas < 24) return `${horas}h`;
  const dias = Math.floor(horas / 24);
  return `${dias}d`;
}

const canalIcon: Record<string, string> = {
  whatsapp: "W",
  instagram: "I",
  landpage: "L",
};

export function KanbanCard({ cliente, onClick, onDragStart }: KanbanCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, cliente.id, cliente.etapa_atual)}
      onClick={() => onClick(cliente)}
      className="bg-surface border border-border rounded-lg p-3 cursor-pointer hover:border-brand/50 hover:shadow-sm transition-all active:opacity-70 select-none"
    >
      <div className="flex items-start gap-2.5">
        <Avatar name={cliente.nome} size="sm" className="shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{cliente.nome}</p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <CanalBadge canal={cliente.canal_origem} />
            <span className="text-xs text-subtle">{tempoNaEtapa(cliente.atualizado_em)}</span>
          </div>
          {cliente.endereco_entrega && (
            <div className="flex items-start gap-1 mt-2 text-xs text-muted">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="w-3 h-3 shrink-0 mt-px text-subtle"
              >
                <path
                  fillRule="evenodd"
                  d="M8 1a5 5 0 0 0-5 5c0 3.188 2.718 6.274 4.472 8.096a.75.75 0 0 0 1.056 0C10.282 12.274 13 9.188 13 6a5 5 0 0 0-5-5Zm0 6.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="line-clamp-1 leading-snug">{cliente.endereco_entrega}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
