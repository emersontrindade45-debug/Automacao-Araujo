"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const PERIODOS_RAPIDOS = [
  { value: "1d",  label: "Hoje" },
  { value: "7d",  label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
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
  aviso?: string;
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
  const parts = iso.split("-");
  const m = parts[1] ?? "";
  const d = parts[2] ?? "";
  return `${d}/${m}`;
}

function periodoEmDias(period: string): number {
  if (period.endsWith("m")) return parseInt(period) * 30;
  return parseInt(period) || 1;
}

function limiteParaPeriodo(period: string): { label: string; limite: number } {
  const dias = periodoEmDias(period);
  const limite = LIMITE_DIARIO * dias;
  if (dias === 1) return { label: "Hoje", limite };
  return { label: `${dias} dias`, limite };
}

export function OpenAITab() {
  const [period, setPeriod] = useState("7d");
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Filtro personalizado
  const [modo, setModo] = useState<"rapido" | "dias" | "meses">("rapido");
  const [diasCustom, setDiasCustom] = useState("14");
  const [mesesCustom, setMesesCustom] = useState("2");
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Ao trocar modo, foca o input
  useEffect(() => {
    if (modo !== "rapido") inputRef.current?.focus();
  }, [modo]);

  function aplicarCustom() {
    if (modo === "dias") {
      const d = Math.min(Math.max(parseInt(diasCustom) || 1, 1), 365);
      setPeriod(`${d}d`);
    } else {
      const m = Math.min(Math.max(parseInt(mesesCustom) || 1, 1), 12);
      setPeriod(`${m}m`);
    }
  }

  const maxDiaCusto = data ? Math.max(...data.por_dia.map((d) => d.custo), 0.000001) : 1;
  const modeloEntries = data ? Object.entries(data.por_modelo).sort((a, b) => b[1].custo - a[1].custo) : [];
  const refPeriodo = data ? limiteParaPeriodo(period) : null;
  const custoHoje = data?.por_dia.at(-1)?.custo ?? 0;
  const pctDia = Math.min((custoHoje / LIMITE_DIARIO) * 100, 100);
  const cor = (pct: number) => pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-warning" : "bg-brand";

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
        {/* Botões rápidos */}
        <div className="flex items-center gap-1 flex-wrap">
          {PERIODOS_RAPIDOS.map((p) => (
            <button
              key={p.value}
              onClick={() => { setModo("rapido"); setPeriod(p.value); }}
              className={[
                "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                period === p.value && modo === "rapido"
                  ? "bg-brand text-white border-brand"
                  : "bg-surface text-muted border-border hover:border-brand hover:text-brand",
              ].join(" ")}
            >
              {p.label}
            </button>
          ))}

          {/* Separador */}
          <span className="text-border text-xs mx-1">|</span>

          {/* Modo personalizado */}
          <button
            onClick={() => setModo(modo === "dias" ? "rapido" : "dias")}
            className={[
              "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
              modo === "dias"
                ? "bg-brand text-white border-brand"
                : "bg-surface text-muted border-border hover:border-brand hover:text-brand",
            ].join(" ")}
          >
            Dias
          </button>
          <button
            onClick={() => setModo(modo === "meses" ? "rapido" : "meses")}
            className={[
              "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
              modo === "meses"
                ? "bg-brand text-white border-brand"
                : "bg-surface text-muted border-border hover:border-brand hover:text-brand",
            ].join(" ")}
          >
            Meses
          </button>

          {loading && <span className="text-xs text-muted ml-1 animate-pulse">Atualizando...</span>}
          <button
            onClick={() => buscar(period)}
            className="ml-auto text-xs text-muted hover:text-foreground transition-colors"
          >
            ↻ Atualizar
          </button>
        </div>

        {/* Input personalizado */}
        {modo !== "rapido" && (
          <div className="flex items-center gap-2 pt-1">
            {modo === "dias" ? (
              <>
                <label className="text-xs text-muted shrink-0">Últimos</label>
                <input
                  ref={inputRef}
                  type="number"
                  min={1}
                  max={365}
                  value={diasCustom}
                  onChange={(e) => setDiasCustom(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && aplicarCustom()}
                  className="w-20 px-2 py-1 text-xs border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:border-brand"
                />
                <label className="text-xs text-muted shrink-0">dias</label>
              </>
            ) : (
              <>
                <label className="text-xs text-muted shrink-0">Últimos</label>
                <input
                  ref={inputRef}
                  type="number"
                  min={1}
                  max={12}
                  value={mesesCustom}
                  onChange={(e) => setMesesCustom(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && aplicarCustom()}
                  className="w-20 px-2 py-1 text-xs border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:border-brand"
                />
                <label className="text-xs text-muted shrink-0">
                  {parseInt(mesesCustom) === 1 ? "mês" : "meses"}
                </label>
              </>
            )}
            <button
              onClick={aplicarCustom}
              className="px-3 py-1 rounded-lg text-xs font-medium bg-brand text-white hover:opacity-90 transition-opacity"
            >
              Aplicar
            </button>
            <span className="text-xs text-subtle">
              {modo === "dias"
                ? `≈ US$ ${(LIMITE_DIARIO * (parseInt(diasCustom) || 1)).toFixed(2)} esperado`
                : `≈ US$ ${(LIMITE_DIARIO * 30 * (parseInt(mesesCustom) || 1)).toFixed(2)} esperado`}
            </span>
          </div>
        )}
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
          {/* Barras de progresso */}
          <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Consumo vs limite de referência</h3>

            {/* Barra do dia — sempre visível */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted">Hoje</span>
                <span className={pctDia >= 80 ? "text-warning font-semibold" : "text-foreground"}>
                  {fmtUsd(custoHoje)} / {fmtUsd(LIMITE_DIARIO)}
                  {pctDia >= 80 && " ⚠️"}
                </span>
              </div>
              <div className="h-2 bg-surface-subtle rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${cor(pctDia)}`}
                  style={{ width: `${Math.max(pctDia, custoHoje > 0 ? 1 : 0)}%` }}
                />
              </div>
              <p className="text-[10px] text-subtle text-right">{pctDia.toFixed(1)}% do limite diário</p>
            </div>

            {/* Barra do período selecionado */}
            {refPeriodo && periodoEmDias(period) > 1 && (() => {
              const pct = Math.min((data.total_custo_usd / refPeriodo.limite) * 100, 100);
              return (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">{refPeriodo.label}</span>
                    <span className={pct >= 80 ? "text-warning font-semibold" : "text-foreground"}>
                      {fmtUsd(data.total_custo_usd)} / {fmtUsd(refPeriodo.limite)}
                      {pct >= 80 && " ⚠️"}
                    </span>
                  </div>
                  <div className="h-2 bg-surface-subtle rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${cor(pct)}`}
                      style={{ width: `${Math.max(pct, data.total_custo_usd > 0 ? 1 : 0)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-subtle text-right">{pct.toFixed(1)}% do limite estimado para o período</p>
                </div>
              );
            })()}

            <p className="text-[10px] text-subtle pt-1">
              Alerta WhatsApp às 18h quando consumo diário ≥ 80% de US$ {LIMITE_DIARIO.toFixed(2)} (US$ {(LIMITE_DIARIO * 0.8).toFixed(3)})
            </p>
          </div>

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
                  : fmtUsd(0)}
              </p>
              <p className="text-xs text-subtle mt-1">{data.por_dia.length} dias no período</p>
            </div>
          </div>

          {data.aviso && (
            <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-3 text-xs text-warning">
              {data.aviso}
            </div>
          )}

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
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
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
