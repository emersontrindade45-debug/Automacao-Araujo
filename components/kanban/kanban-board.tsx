"use client";

import { useState } from "react";
import type { Cliente, Etapa } from "@/lib/types";
import { etapaLabels } from "@/components/ui/badge";
import { KanbanCard } from "./kanban-card";
import { KanbanPanel } from "./kanban-panel";

const ETAPAS: Etapa[] = [
  "novo",
  "atendimento",
  "fechamento",
  "pedido_gerado",
  "separacao",
  "em_rota",
  "pos_venda",
  "follow_up",
  "marketing",
];

interface KanbanBoardProps {
  initialClientes: Cliente[];
}

export function KanbanBoard({ initialClientes }: KanbanBoardProps) {
  const [clientes, setClientes] = useState<Cliente[]>(initialClientes);
  const [selecionado, setSelecionado] = useState<Cliente | null>(null);
  const [draggingOver, setDraggingOver] = useState<Etapa | null>(null);

  function handleDragStart(e: React.DragEvent, clienteId: string, fromEtapa: Etapa) {
    e.dataTransfer.setData("clienteId", clienteId);
    e.dataTransfer.setData("fromEtapa", fromEtapa);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, etapa: Etapa) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDraggingOver(etapa);
  }

  function handleDrop(e: React.DragEvent, toEtapa: Etapa) {
    e.preventDefault();
    setDraggingOver(null);
    const clienteId = e.dataTransfer.getData("clienteId");
    const fromEtapa = e.dataTransfer.getData("fromEtapa") as Etapa;
    if (!clienteId || fromEtapa === toEtapa) return;
    moverCliente(clienteId, toEtapa);
  }

  function moverCliente(clienteId: string, novaEtapa: Etapa) {
    setClientes((prev) =>
      prev.map((c) =>
        c.id === clienteId
          ? { ...c, etapa_atual: novaEtapa, atualizado_em: new Date().toISOString() }
          : c
      )
    );
    if (selecionado?.id === clienteId) {
      setSelecionado((prev) =>
        prev ? { ...prev, etapa_atual: novaEtapa, atualizado_em: new Date().toISOString() } : null
      );
    }
  }

  return (
    <>
      <div className="flex gap-3 h-full overflow-x-auto pb-4">
        {ETAPAS.map((etapa) => {
          const cards = clientes.filter((c) => c.etapa_atual === etapa);
          const isOver = draggingOver === etapa;
          return (
            <div
              key={etapa}
              className="flex flex-col shrink-0 w-60"
              onDragOver={(e) => handleDragOver(e, etapa)}
              onDragLeave={() => setDraggingOver(null)}
              onDrop={(e) => handleDrop(e, etapa)}
            >
              {/* Column header */}
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-semibold text-muted uppercase tracking-wide">
                  {etapaLabels[etapa]}
                </span>
                <span className="text-xs bg-surface-subtle text-muted rounded-full px-2 py-0.5 font-medium">
                  {cards.length}
                </span>
              </div>

              {/* Drop zone */}
              <div
                className={[
                  "flex flex-col gap-2 flex-1 rounded-xl p-2 min-h-32 transition-colors",
                  isOver
                    ? "bg-brand/8 border-2 border-dashed border-brand/40"
                    : "bg-surface-subtle border-2 border-transparent",
                ].join(" ")}
              >
                {cards.map((c) => (
                  <KanbanCard
                    key={c.id}
                    cliente={c}
                    onClick={setSelecionado}
                    onDragStart={handleDragStart}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selecionado && (
        <KanbanPanel
          cliente={selecionado}
          onClose={() => setSelecionado(null)}
          onMoverEtapa={moverCliente}
        />
      )}
    </>
  );
}
