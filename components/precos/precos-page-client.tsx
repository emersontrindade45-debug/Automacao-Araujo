"use client";

import { useState } from "react";
import type { Produto } from "@/lib/types";
import type { AtualizacaoPreco } from "@/lib/supabase/queries/precos";
import { PrecosTable } from "./precos-table";
import { CatalogoTab } from "./catalogo-tab";

interface PrecosPageClientProps {
  atualizacoes: AtualizacaoPreco[];
  pendentes: number;
  produtos: Produto[];
  isAdmin: boolean;
}

type Aba = "catalogo" | "solicitacoes";

export function PrecosPageClient({ atualizacoes, pendentes, produtos, isAdmin }: PrecosPageClientProps) {
  const [aba, setAba] = useState<Aba>("catalogo");

  const abas: Aba[] = isAdmin ? ["catalogo", "solicitacoes"] : ["catalogo"];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Preços</h1>
          <p className="text-sm text-muted mt-0.5">
            {isAdmin ? "Gerencie catálogo e aprove atualizações de preço" : "Consulte preços e estoque do catálogo"}
          </p>
        </div>
        {isAdmin && pendentes > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-warning-bg text-warning border border-[var(--warning-border)] px-3 py-1.5 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-warning inline-block" />
            {pendentes} pendente{pendentes > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {abas.length > 1 && (
        <div className="flex gap-1 border-b border-border">
          {abas.map((t) => (
            <button
              key={t}
              onClick={() => setAba(t)}
              className={[
                "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                aba === t
                  ? "border-brand text-brand"
                  : "border-transparent text-muted hover:text-foreground",
              ].join(" ")}
            >
              {t === "catalogo" ? "Catálogo" : "Solicitações"}
              {t === "solicitacoes" && pendentes > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-warning text-white text-[10px] font-bold">
                  {pendentes}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {aba === "catalogo" && <CatalogoTab produtos={produtos} somenteLeitura={!isAdmin} />}
      {aba === "solicitacoes" && isAdmin && <PrecosTable atualizacoes={atualizacoes} />}
    </div>
  );
}
