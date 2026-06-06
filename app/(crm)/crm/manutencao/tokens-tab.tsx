"use client";

import Link from "next/link";
import type { ResumoTokens } from "./actions";

const PERIODO_LABELS: Record<string, string> = {
  "1h": "1 hora", "24h": "24 horas", "7d": "7 dias", "10d": "10 dias",
  "15d": "15 dias", "30d": "30 dias",
};

interface Props {
  resumo: ResumoTokens;
  period: string;
  periodos: string[];
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatUsd(n: number): string {
  return `US$ ${n.toFixed(4)}`;
}

export function TokensTab({ resumo, period, periodos }: Props) {
  const sourceEntries = Object.entries(resumo.por_source).sort((a, b) => b[1].tokens - a[1].tokens);
  const modelEntries = Object.entries(resumo.por_model).sort((a, b) => b[1].tokens - a[1].tokens);
  const maxTokens = Math.max(...sourceEntries.map(([, v]) => v.tokens), 1);

  return (
    <div className="space-y-6">
      {/* Seletor de período */}
      <div className="flex items-center gap-1 flex-wrap">
        {periodos.map((p) => (
          <Link
            key={p}
            href={`/crm/manutencao?tab=tokens&period=${p}`}
            className={[
              "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
              period === p
                ? "bg-brand text-white border-brand"
                : "bg-surface text-muted border-border hover:border-brand hover:text-brand",
            ].join(" ")}
          >
            {PERIODO_LABELS[p] ?? p}
          </Link>
        ))}
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted mb-1">Total de tokens</p>
          <p className="text-2xl font-semibold text-foreground">{formatTokens(resumo.total_tokens)}</p>
          <p className="text-xs text-subtle mt-1">{resumo.total_chamadas} chamada(s)</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted mb-1">Custo total</p>
          <p className="text-2xl font-semibold text-foreground">{formatUsd(resumo.total_custo_usd)}</p>
          <p className="text-xs text-subtle mt-1">Últimas {PERIODO_LABELS[period] ?? period}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted mb-1">Custo médio por chamada</p>
          <p className="text-2xl font-semibold text-foreground">
            {resumo.total_chamadas > 0
              ? formatUsd(resumo.total_custo_usd / resumo.total_chamadas)
              : "US$ 0,0000"}
          </p>
          <p className="text-xs text-subtle mt-1">&nbsp;</p>
        </div>
      </div>

      {resumo.total_chamadas === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg className="h-10 w-10 text-muted mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4m0 4h.01" strokeLinecap="round" />
          </svg>
          <p className="text-sm font-medium text-foreground">Nenhum registro de tokens</p>
          <p className="text-xs text-muted mt-1">Adicione nós "Log Tokens" nos fluxos n8n para rastrear</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Por fluxo/rota */}
          <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Por fluxo / rota</h3>
            {sourceEntries.map(([source, v]) => (
              <div key={source} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground font-medium truncate max-w-[60%]">{source}</span>
                  <span className="text-muted">{formatTokens(v.tokens)} · {formatUsd(v.custo)}</span>
                </div>
                <div className="h-1.5 bg-surface-subtle rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full"
                    style={{ width: `${Math.round((v.tokens / maxTokens) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Por modelo */}
          <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Por modelo</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted">
                  <th className="text-left pb-2">Modelo</th>
                  <th className="text-right pb-2">Tokens</th>
                  <th className="text-right pb-2">Custo</th>
                  <th className="text-right pb-2">Chamadas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {modelEntries.map(([model, v]) => (
                  <tr key={model}>
                    <td className="py-2 text-foreground font-medium">{model}</td>
                    <td className="py-2 text-right text-muted">{formatTokens(v.tokens)}</td>
                    <td className="py-2 text-right text-muted">{formatUsd(v.custo)}</td>
                    <td className="py-2 text-right text-muted">{v.chamadas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
