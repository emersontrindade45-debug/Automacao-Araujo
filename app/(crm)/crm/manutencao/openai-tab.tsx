"use client";

import { useState, useEffect, useCallback } from "react";

const PERIODOS = [
  { value: "1d",  label: "Hoje" },
  { value: "3d",  label: "3 dias" },
  { value: "7d",  label: "7 dias" },
  { value: "15d", label: "15 dias" },
  { value: "30d", label: "30 dias" },
];

const LIMITE_DIARIO = 0.19;
const LIMITE_SEMANAL = 1.35;
const LIMITE_MENSAL  = 5.77;

type DiaUsage = { dia: string; input: number; output: number; requests: number; custo: number };
type ModeloUsage = { input: number; output: number; requests: number; custo: number };

type UsageData = {
  period: string;
  start: string;
  end: string;
  total_tokens: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_requests: number;
  total_custo_usd: number;
  por_dia: DiaUsage[];
  por_modelo: Record<string, ModeloUsage>;
};

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtUsd(n: number): string {
  return `US$ ${n.toFixed(4)}`;
}

function fmtData(iso: string): string {
  // Evita hydration mismatch — não usar Date, só manipulação de string
  const parts = iso.split("-");
  const m = parts[1] ?? "";
  const d = parts[2] ?? "";
  return `${d}/${m}`;
}

export function OpenAITab() {
  const [period, setPeriod] = useState("7d");
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const buscar = useCallback(async (p: string) => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(`/api/manutencao/openai-usage?period=${p}`);
      if (!res.ok) {
        const err = await res.json();
        setErro(err.error ?? "Erro ao buscar dados");
        return;
      }
      setData(await res.json());
    } catch {
      setErro("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { buscar(period); }, [period, buscar]);

  const maxDiaCusto = data ? Math.max(...data.por_dia.map((d) => d.custo), 0.000001) : 1;
  const modeloEntries = data ? Object.entries(data.por_modelo).sort((a, b) => b[1].custo - a[1].custo) : [];

  return (
    <div className="space-y-6">
      {/* Filtros de período */}
      <div className="flex items-center gap-1 flex-wrap">
        {PERIODOS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={[
              "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
              period === p.value
                ? "bg-brand text-white border-brand"
                : "bg-surface text-muted border-border hover:border-brand hover:text-brand",
            ].join(" ")}
          >
            {p.label}
          </button>
        ))}
        {loading && (
          <span className="text-xs text-muted ml-2 animate-pulse">Atualizando...</span>
        )}
        <button
          onClick={() => buscar(period)}
          className="ml-auto text-xs text-muted hover:text-foreground transition-colors"
        >
          ↻ Atualizar
        </button>
      </div>

      {erro && (
        <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-sm text-danger">
          {erro}
        </div>
      )}

      {!data && !loading && !erro && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted">Selecione um período para carregar os dados</p>
        </div>
      )}

      {data && (
        <>
          {/* Barras de progresso vs limites de referência */}
          {(() => {
            const custoHoje = data.por_dia.at(-1)?.custo ?? 0;
            const pctDia = Math.min((custoHoje / LIMITE_DIARIO) * 100, 100);
            const pctSem = Math.min((data.total_custo_usd / LIMITE_SEMANAL) * 100, 100);
            const pctMes = Math.min((data.total_custo_usd / LIMITE_MENSAL) * 100, 100);
            const cor = (pct: number) =>
              pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-warning" : "bg-brand";

            const linhas = [
              { label: "Hoje", custo: custoHoje, limite: LIMITE_DIARIO, pct: pctDia },
              ...(period === "7d"  ? [{ label: "Semana", custo: data.total_custo_usd, limite: LIMITE_SEMANAL, pct: pctSem }] : []),
              ...(period === "30d" ? [{ label: "Mês",    custo: data.total_custo_usd, limite: LIMITE_MENSAL,  pct: pctMes  }] : []),
            ];

            return (
              <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Consumo vs limite de referência</h3>
                {linhas.map((l) => (
                  <div key={l.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted">{l.label}</span>
                      <span className={l.pct >= 80 ? "text-warning font-semibold" : "text-foreground"}>
                        {fmtUsd(l.custo)} / {fmtUsd(l.limite)}
                        {l.pct >= 80 && " ⚠️"}
                      </span>
                    </div>
                    <div className="h-2 bg-surface-subtle rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${cor(l.pct)}`}
                        style={{ width: `${Math.max(l.pct, l.custo > 0 ? 1 : 0)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-subtle text-right">{l.pct.toFixed(1)}% do limite diário</p>
                  </div>
                ))}
                <p className="text-[10px] text-subtle pt-1">
                  Alerta WhatsApp disparado automaticamente ao atingir 80% do limite diário (US$ {(LIMITE_DIARIO * 0.8).toFixed(2)})
                </p>
              </div>
            );
          })()}

          {/* Cards de resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-xs text-muted mb-1">Total de tokens</p>
              <p className="text-xl font-semibold text-foreground">{fmt(data.total_tokens)}</p>
              <p className="text-xs text-subtle mt-1">{fmt(data.total_input_tokens)} entrada · {fmt(data.total_output_tokens)} saída</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-xs text-muted mb-1">Custo estimado</p>
              <p className="text-xl font-semibold text-foreground">{fmtUsd(data.total_custo_usd)}</p>
              <p className="text-xs text-subtle mt-1">{data.start} → {data.end}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-xs text-muted mb-1">Requisições</p>
              <p className="text-xl font-semibold text-foreground">{data.total_requests.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-subtle mt-1">chamadas à API</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-xs text-muted mb-1">Custo médio/dia</p>
              <p className="text-xl font-semibold text-foreground">
                {data.por_dia.length > 0
                  ? fmtUsd(data.total_custo_usd / data.por_dia.length)
                  : "US$ 0,0000"}
              </p>
              <p className="text-xs text-subtle mt-1">{data.por_dia.length} dias no período</p>
            </div>
          </div>

          {data.total_tokens === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-border rounded-xl bg-surface">
              <svg className="h-8 w-8 text-muted mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4m0 4h.01" strokeLinecap="round" />
              </svg>
              <p className="text-sm font-medium text-foreground">Sem uso no período</p>
              <p className="text-xs text-muted mt-1">Nenhuma chamada registrada entre {data.start} e {data.end}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico por dia */}
              <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Custo por dia</h3>
                {data.por_dia.length === 0 ? (
                  <p className="text-xs text-muted">Sem dados</p>
                ) : (
                  <div className="space-y-2">
                    {data.por_dia.map((d) => (
                      <div key={d.dia} className="space-y-0.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted w-12 shrink-0">{fmtData(d.dia)}</span>
                          <span className="text-foreground font-medium">{fmt(d.input + d.output)} tokens</span>
                          <span className="text-subtle">{fmtUsd(d.custo)}</span>
                        </div>
                        <div className="h-1.5 bg-surface-subtle rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand rounded-full transition-all"
                            style={{ width: `${Math.max((d.custo / maxDiaCusto) * 100, d.custo > 0 ? 2 : 0)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Breakdown por modelo */}
              <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Por modelo</h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted border-b border-border">
                      <th className="text-left pb-2">Modelo</th>
                      <th className="text-right pb-2">Tokens</th>
                      <th className="text-right pb-2">Req.</th>
                      <th className="text-right pb-2">Custo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {modeloEntries.map(([modelo, v]) => (
                      <tr key={modelo}>
                        <td className="py-2 text-foreground font-medium truncate max-w-[120px]">{modelo}</td>
                        <td className="py-2 text-right text-muted">{fmt(v.input + v.output)}</td>
                        <td className="py-2 text-right text-muted">{v.requests}</td>
                        <td className="py-2 text-right text-muted">{fmtUsd(v.custo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
