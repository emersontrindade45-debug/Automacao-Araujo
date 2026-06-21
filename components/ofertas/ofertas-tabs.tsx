"use client";

import { useState } from "react";
import type { Produto, TipoProduto } from "@/lib/types";
import { OfertasTable } from "./ofertas-table";

interface Props {
  itens: Produto[];
}

const ABAS: { tipo: TipoProduto; label: string }[] = [
  { tipo: "oferta", label: "Ofertas" },
  { tipo: "kit", label: "Kits" },
  { tipo: "padaria", label: "Padaria" },
];

export function OfertasTabs({ itens }: Props) {
  const [abaAtiva, setAbaAtiva] = useState<TipoProduto>("oferta");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 border-b border-border">
        {ABAS.map((aba) => (
          <button
            key={aba.tipo}
            onClick={() => setAbaAtiva(aba.tipo)}
            className={[
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              abaAtiva === aba.tipo
                ? "border-brand text-brand"
                : "border-transparent text-muted hover:text-foreground",
            ].join(" ")}
          >
            {aba.label}
          </button>
        ))}
      </div>

      <OfertasTable
        key={abaAtiva}
        itens={itens.filter((i) => i.tipo === abaAtiva)}
        tipoFixo={abaAtiva}
      />
    </div>
  );
}
