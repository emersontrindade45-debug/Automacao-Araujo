"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const PERIODOS_RAPIDOS = [
  { value: "1d",  label: "Hoje" },
  { value: "7d",  label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
];

const LIMITE_DIARIO = 0.19;
const SALDO_PADRAO  = 4.56;

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

function fmtUsd2(n: number): string {
  return `US$ ${n.toFixed(2)}`;
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

  // Saldo disponível — editável, salvo em localStorage
  const [saldo, setSaldo] = useState(SALDO_PADRAO);
  const [editandoSaldo, setEditandoSaldo] = useState(false);
  const [saldoInput, setSaldoInput] = useState(String(SALDO_PADRAO));
  const saldoInputRef = useRef<HTMLInputElement>(null);

  // Carrega saldo salvo
  useEffect(() => {
    const salvo = localStorage.getItem("openai_saldo_disponivel");
    if (salvo) {
      const v = parseFloat(salvo);
      if (!isNaN(v) && v >= 0) { setSaldo(v); setSaldoInput(v.toFixed(2)); }
    }
  }, []);

  function salvarSaldo() {
    const v = parseFloat(saldoInput);
    if (!isNaN(v) && v >= 0) {
      setSaldo(v);
      localStorage.setItem("openai_saldo_disponivel", String(v));
    }
    setEditandoSaldo(false);
  }

  useEffect(() => {
    if (editandoSaldo) saldoInputRef.current?.focus();
  }, [editandoSaldo]);

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

  const dias = periodoEmDias(period);
  const limitePeriodo = LIMITE_DIARIO * dias;
  const consumidoPeriodo = data?.total_custo_usd ?? 0;
  const custoHoje = data?.por_dia.at(-1)?.custo ?? 0;

  // Percentuais
  const pctDia     = Math.min((custoHoje / LIMITE_DIARIO) * 100, 100);
  const pctPeriodo = Math.min((consumidoPeriodo / limitePeriodo) * 100, 100);
  const pctSaldo   = Math.min((consumidoPeriodo / saldo) * 100, 100);
  const saldoRestante = Math.max(saldo - consumidoPeriodo, 0);

  function corBarra(pct: number) {
    return pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-warning" : "bg-brand";
  }

  const maxDiaCusto = data ? Math.max(...data.por_dia.map((d) => d.custo), 0.000001) : 1;
  const modeloEntries = data ? Object.entries(data.por_modelo).sort((a, b) => b[1].custo - a[1].custo) : [];

  return (
    <div className="space-y-6">
      {/* Saldo disponível */}
      <div className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted mb-0.5">Saldo total disponível</p>
          {editandoSaldo ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">US$</span>
              <input
                ref={saldoInputRef}
                type="number"
                min={0}
                step={0.01}
                value={saldoInput}
                onChange={(e) => setSaldoInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") salvarSaldo(); if (e.key === "Escape") setEditandoSaldo(false); }}
                className="w-28 px-2 py-1 text-sm border border-brand rounded-lg bg-surface text-foreground focus:outline-none"
              />
              <button onClick={salvarSaldo} className="text-xs px-2 py-1 bg-brand text-white rounded-lg">Salvar</button>
              <button onClick={() => setEditandoSaldo(false)} className="text-xs text-muted hover:text-foreground">Cancelar</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-2xl font-semibold text-foreground">{fmtUsd2(saldo)}</p>
              <button
                onClick={() => { setSaldoInput(saldo.toFixed(2)); setEditandoSaldo(true); }}
                className="text-xs text-muted hover:text-brand transition-colors"
                title="Editar saldo"
              >
                ✏️ editar
              </button>
            </div>
          )}
          <p className="text-[10px] text-subtle mt-1">Atualize quando os créditos mudarem em platform.openai.com → Billing → Credit grants</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted mb-0.5">Restante após período</p>
          <p className={`text-xl font-semibold ${saldoRestante < saldo * 0.2 ? "text-warning" : "text-foreground"}`}>
            {fmtUsd2(saldoRestante)}
          </p>
          <p className="text-[10px] text-subtle mt-1">{fmtUsd2(consumidoPeriodo)} usados no período</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
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
          <span className="text-border text-xs mx-1">|</span>
          <button
            onClick={() => setModo(modo === "dias" ? "rapido" : "dias")}
            className={[
              "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
              modo === "dias" ? "bg-brand text-white border-brand" : "bg-surface text-muted border-border hover:border-brand hover:text-brand",
            ].join(" ")}
          >
            Dias
          </button>
          <button
            onClick={() => setModo(modo === "meses" ? "rapido" : "meses")}
            className={[
              "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
              modo === "meses" ? "bg-brand text-white border-brand" : "bg-surface text-muted border-border hover:border-brand hover:text-brand",
            ].join(" ")}
          >
            Meses
          </button>
          {loading && <span className="text-xs text-muted ml-1 animate-pulse">Atualizando...</span>}
          <button onClick={() => buscar(period)} className="ml-auto text-xs text-muted hover:text-foreground transition-colors">
            ↻ Atualizar
          </button>
        </div>

        {modo !== "rapido" && (
          <div className="flex items-center gap-2 pt-1">
            <label className="text-xs text-muted shrink-0">Últimos</label>
            {modo === "dias" ? (
              <input
                ref={inputRef}
                type="number" min={1} max={365}
                value={diasCustom}
                onChange={(e) => setDiasCustom(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && aplicarCustom()}
                className="w-20 px-2 py-1 text-xs border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:border-brand"
              />
            ) : (
              <input
                ref={inputRef}
                type="number" min={1} max={12}
                value={mesesCustom}
                onChange={(e) => setMesesCustom(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && aplicarCustom()}
                className="w-20 px-2 py-1 text-xs border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:border-brand"
              />
            )}
            <label className="text-xs text-muted shrink-0">
              {modo === "dias" ? "dias" : parseInt(mesesCustom) === 1 ? "mês" : "meses"}
            </label>
            <button onClick={aplicarCustom} className="px-3 py-1 rounded-lg text-xs font-medium bg-brand text-white hover:opacity-90 transition-opacity">
              Aplicar
            </button>
            <span className="text-xs text-subtle">
              ≈ {fmtUsd2(LIMITE_DIARIO * (modo === "dias" ? (parseInt(diasCustom) || 1) : (parseInt(mesesCustom) || 1) * 30))} esperado
            </span>
          </div>
        )}
      </div>

      {erro && (
        <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-sm text-danger">{erro}</div>
      )}

      {!data && !loading && !erro && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted">Selecione um período para carregar os dados</p>
        </div>
      )}

      {data && (
        <>
          {/* Barras de progresso */}
          <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Referências de consumo</h3>

            {/* Hoje vs limite diário */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted">Hoje</span>
                <span className={pctDia >= 80 ? "text-warning font-semibold" : "text-foreground"}>
                  {fmtUsd(custoHoje)} / {fmtUsd2(LIMITE_DIARIO)}/dia
                  {pctDia >= 80 && " ⚠️"}
                </span>
              </div>
              <div className="h-2 bg-surface-subtle rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${corBarra(pctDia)}`}
                  style={{ width: `${Math.max(pctDia, custoHoje > 0 ? 1 : 0)}%` }} />
              </div>
              <p className="text-[10px] text-subtle text-right">{pctDia.toFixed(1)}% do limite diário</p>
            </div>

            {/* Período selecionado vs limite proporcional */}
            {dias > 1 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">{dias} dias — consumido</span>
                  <span className={pctPeriodo >= 80 ? "text-warning font-semibold" : "text-foreground"}>
                    {fmtUsd(consumidoPeriodo)} / {fmtUsd2(limitePeriodo)} estimado
                    {pctPeriodo >= 80 && " ⚠️"}
                  </span>
                </div>
                <div className="h-2 bg-surface-subtle rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${corBarra(pctPeriodo)}`}
                    style={{ width: `${Math.max(pctPeriodo, consumidoPeriodo > 0 ? 1 : 0)}%` }} />
                </div>
                <p className="text-[10px] text-subtle text-right">{pctPeriodo.toFixed(1)}% do estimado para {dias} dias</p>
              </div>
            )}

            {/* Consumo do período vs saldo total */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted">Saldo total usado no período</span>
                <span className={pctSaldo >= 80 ? "text-danger font-semibold" : "text-foreground"}>
                  {fmtUsd(consumidoPeriodo)} / {fmtUsd2(saldo)} disponível
                  {pctSaldo >= 80 && " ⚠️"}
                </span>
              </div>
              <div className="h-2 bg-surface-subtle rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${corBarra(pctSaldo)}`}
                  style={{ width: `${Math.max(pctSaldo, consumidoPeriodo > 0 ? 1 : 0)}%` }} />
              </div>
              <p className="text-[10px] text-subtle text-right">{pctSaldo.toFixed(1)}% do saldo total disponível</p>
            </div>

            <p className="text-[10px] text-subtle border-t border-border pt-2">
              Alerta WhatsApp às 18h quando consumo diário ≥ 80% de US$ {LIMITE_DIARIO.toFixed(2)}
            </p>
          </div>

          {/* Cards resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-xs text-muted mb-1">Total de tokens</p>
              <p className="text-xl font-semibold text-foreground">{fmt(data.total_tokens)}</p>
              <p className="text-xs text-subtle mt-1">{fmt(data.total_input_tokens)} entrada · {fmt(data.total_output_tokens)} saída</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-xs text-muted mb-1">Custo no período</p>
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
                {data.por_dia.length > 0 ? fmtUsd(data.total_custo_usd / data.por_dia.length) : fmtUsd(0)}
              </p>
              <p className="text-xs text-subtle mt-1">{data.por_dia.length} dias no período</p>
            </div>
          </div>

          {data.aviso && (
            <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-3 text-xs text-warning">{data.aviso}</div>
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
                        <div className="h-full bg-brand rounded-full transition-all"
                          style={{ width: `${Math.max((d.custo / maxDiaCusto) * 100, d.custo > 0 ? 2 : 0)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

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
