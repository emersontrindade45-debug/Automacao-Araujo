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
        </div>
      </div>
    </div>
  );
}
