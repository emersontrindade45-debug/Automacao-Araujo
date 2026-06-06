"use client";

import { useState } from "react";
import Link from "next/link";
import { resolverErroAction, type ErroManutencao } from "./actions";

const STATUS_LABELS: Record<string, { label: string; classes: string }> = {
  pendente:      { label: "Pendente",       classes: "bg-warning/15 text-warning" },
  resolvido_ia:  { label: "Resolvido pela IA", classes: "bg-success/15 text-success" },
  resolvido_dev: { label: "Resolvido pelo dev", classes: "bg-brand/15 text-brand" },
  sem_solucao:   { label: "Sem solução",    classes: "bg-danger/15 text-danger" },
};

const STATUS_OPTS = ["todos", "pendente", "resolvido_ia", "resolvido_dev", "sem_solucao"] as const;
const STATUS_NAV_LABELS: Record<string, string> = {
  todos: "Todos",
  pendente: "Pendente",
  resolvido_ia: "Resolvido IA",
  resolvido_dev: "Resolvido dev",
  sem_solucao: "Sem solução",
};

interface Props {
  erros: ErroManutencao[];
  statusFiltro: string;
}

export function ErrosTab({ erros, statusFiltro }: Props) {
  const [expandido, setExpandido] = useState<string | null>(null);
  const [resolvendo, setResolvendo] = useState<string | null>(null);

  async function handleResolver(id: string) {
    setResolvendo(id);
    await resolverErroAction(id);
    setResolvendo(null);
  }

  return (
    <div className="space-y-4">
      {/* Filtro de status */}
      <div className="flex items-center gap-1 flex-wrap">
        {STATUS_OPTS.map((s) => (
          <Link
            key={s}
            href={`/crm/manutencao?tab=erros&status=${s}`}
            className={[
              "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
              statusFiltro === s
                ? "bg-brand text-white border-brand"
                : "bg-surface text-muted border-border hover:border-brand hover:text-brand",
            ].join(" ")}
          >
            {STATUS_NAV_LABELS[s]}
          </Link>
        ))}
        <span className="ml-auto text-xs text-muted">{erros.length} registro(s)</span>
      </div>

      {erros.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg className="h-10 w-10 text-success mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="9" />
          </svg>
          <p className="text-sm font-medium text-foreground">Nenhum erro encontrado</p>
          <p className="text-xs text-muted mt-1">Sistema operando normalmente</p>
        </div>
      ) : (
        <div className="space-y-2">
          {erros.map((erro) => {
            const st = STATUS_LABELS[erro.status] ?? STATUS_LABELS.pendente;
            const aberto = expandido === erro.id;
            const origem = erro.workflow_name ?? erro.route ?? erro.source;
            const data = new Date(erro.created_at).toLocaleString("pt-BR");

            return (
              <div key={erro.id} className="border border-border rounded-xl bg-surface overflow-hidden">
                {/* Linha resumo */}
                <button
                  onClick={() => setExpandido(aberto ? null : erro.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-subtle transition-colors"
                >
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${st.classes}`}>
                    {st.label}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-foreground truncate">{origem}</span>
                    <span className="block text-xs text-muted truncate">{erro.error_message}</span>
                  </span>
                  <span className="shrink-0 text-xs text-subtle">{data}</span>
                  <svg
                    className={`h-4 w-4 text-muted shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {/* Detalhe expandido */}
                {aberto && (
                  <div className="border-t border-border px-4 py-4 space-y-4 bg-surface-subtle">
                    {erro.node_name && (
                      <div>
                        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Nó</p>
                        <p className="text-sm text-foreground">{erro.node_name}</p>
                      </div>
                    )}

                    {erro.diagnostico_ia && (
                      <div>
                        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Diagnóstico da IA</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{erro.diagnostico_ia}</p>
                      </div>
                    )}

                    {Array.isArray(erro.tentativas_ia) && erro.tentativas_ia.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">
                          Tentativas ({erro.tentativas_ia.length})
                        </p>
                        <ol className="space-y-1">
                          {(erro.tentativas_ia as { ts: string; passo: string }[]).map((t, i) => (
                            <li key={i} className="text-xs text-muted flex gap-2">
                              <span className="shrink-0 text-subtle">{new Date(t.ts).toLocaleTimeString("pt-BR")}</span>
                              <span>{String(t.passo)}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {erro.error_stack && (
                      <div>
                        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Stack trace</p>
                        <pre className="text-xs text-muted bg-surface border border-border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                          {erro.error_stack}
                        </pre>
                      </div>
                    )}

                    {erro.context != null && (
                      <div>
                        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Contexto</p>
                        <pre className="text-xs text-muted bg-surface border border-border rounded-lg p-3 overflow-x-auto">
                          {JSON.stringify(erro.context as Record<string, unknown>, null, 2)}
                        </pre>
                      </div>
                    )}

                    {erro.status !== "resolvido_dev" && (
                      <button
                        onClick={() => handleResolver(erro.id)}
                        disabled={resolvendo === erro.id}
                        className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand/90 disabled:opacity-50 transition-colors"
                      >
                        {resolvendo === erro.id ? "Resolvendo..." : "Marcar como resolvido pelo dev"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
