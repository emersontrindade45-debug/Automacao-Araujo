"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import type { Produto } from "@/lib/types";
import { editarProdutoAction, ativarDesativarProdutosAction } from "@/app/(crm)/precos/actions";
import { Button } from "@/components/ui/button";
import { ImportarModal } from "./importar-modal";
import { createClient } from "@/lib/supabase/client";

interface CatalogoTabProps {
  produtos: Produto[];
  somenteLeitura?: boolean;
}

function formatMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Aceita vírgula ou ponto como separador decimal (ex: "12,50" ou "12.50")
function parsePreco(v: string): number {
  return parseFloat(v.trim().replace(",", "."));
}

interface EditState {
  preco_atual: string;
  ativo: boolean;
}

interface Filtros {
  nome: string;
  unidade: string;
  precoMin: string;
  precoMax: string;
  ativo: "" | "true" | "false";
}

const filtrosIniciais: Filtros = {
  nome: "",
  unidade: "",
  precoMin: "",
  precoMax: "",
  ativo: "",
};

export function CatalogoTab({ produtos: inicial, somenteLeitura = false }: CatalogoTabProps) {
  const [produtos, setProdutos] = useState<Produto[]>(inicial);

  useEffect(() => {
    setProdutos(inicial);
  }, [inicial]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<EditState | null>(null);
  const [importarAberto, setImportarAberto] = useState(false);
  const [pending, startTransition] = useTransition();
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciais);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("produtos-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "produtos" },
        (payload) => {
          const novo = payload.new as Produto;
          setProdutos((prev) =>
            prev.map((p) => (p.id === novo.id ? { ...p, ...novo } : p))
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const unidades = useMemo(
    () => Array.from(new Set(produtos.map((p) => p.unidade))).sort(),
    [produtos]
  );

  const filtrados = useMemo(() => {
    return produtos.filter((p) => {
      if (filtros.nome && !p.nome.toLowerCase().includes(filtros.nome.toLowerCase())) return false;
      if (filtros.unidade && p.unidade !== filtros.unidade) return false;
      if (filtros.precoMin !== "" && p.preco_atual < parsePreco(filtros.precoMin)) return false;
      if (filtros.precoMax !== "" && p.preco_atual > parsePreco(filtros.precoMax)) return false;
      if (filtros.ativo !== "" && String(p.ativo) !== filtros.ativo) return false;
      return true;
    });
  }, [produtos, filtros]);

  const temFiltroAtivo = Object.values(filtros).some((v) => v !== "");

  function setFiltro<K extends keyof Filtros>(key: K, value: Filtros[K]) {
    setFiltros((prev) => ({ ...prev, [key]: value }));
  }

  function limparFiltros() {
    setFiltros(filtrosIniciais);
  }

  function alternarSelecao(id: string) {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function alternarSelecionarTodos() {
    setSelecionados((prev) => {
      const todosVisiveisSelecionados = filtrados.every((p) => prev.has(p.id));
      if (todosVisiveisSelecionados) {
        const novo = new Set(prev);
        filtrados.forEach((p) => novo.delete(p.id));
        return novo;
      }
      const novo = new Set(prev);
      filtrados.forEach((p) => novo.add(p.id));
      return novo;
    });
  }

  function aplicarAcaoEmLote(ativo: boolean) {
    const ids = Array.from(selecionados);
    if (ids.length === 0) return;
    const acaoLabel = ativo ? "ativar" : "desativar";
    if (!confirm(`${ativo ? "Ativar" : "Desativar"} ${ids.length} produto${ids.length !== 1 ? "s" : ""} selecionado${ids.length !== 1 ? "s" : ""}?`)) return;

    setProdutos((prev) => prev.map((p) => (selecionados.has(p.id) ? { ...p, ativo } : p)));
    startTransition(async () => {
      try {
        await ativarDesativarProdutosAction(ids, ativo);
        setSelecionados(new Set());
      } catch {
        alert(`Falha ao ${acaoLabel} os produtos selecionados. Tente novamente.`);
      }
    });
  }

  function iniciarEdicao(produto: Produto) {
    setEditandoId(produto.id);
    setEditValues({
      preco_atual: String(produto.preco_atual).replace(".", ","),
      ativo: produto.ativo,
    });
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setEditValues(null);
  }

  function salvarEdicao(id: string) {
    if (!editValues) return;
    const payload = {
      preco_atual: parsePreco(editValues.preco_atual),
      ativo: editValues.ativo,
    };
    setProdutos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...payload } : p))
    );
    setEditandoId(null);
    setEditValues(null);
    startTransition(() => editarProdutoAction(id, payload));
  }

  // Liga/desliga o produto direto da listagem, sem entrar no modo edição
  function alternarAtivo(produto: Produto) {
    const payload = {
      preco_atual: produto.preco_atual,
      ativo: !produto.ativo,
    };
    setProdutos((prev) =>
      prev.map((p) => (p.id === produto.id ? { ...p, ...payload } : p))
    );
    startTransition(() => editarProdutoAction(produto.id, payload));
  }

  function onImportarConcluido(atualizados: import("@/lib/supabase/queries/produtos").LinhaPlanilha[]) {
    setProdutos((prev) =>
      prev.map((p) => {
        const atualizado = atualizados.find((a) => a.nome.toLowerCase() === p.nome.toLowerCase());
        return atualizado ? { ...p, preco_atual: atualizado.preco_atual } : p;
      })
    );
  }

  const podeEditar = !pending && !somenteLeitura;

  const inputCls = "h-8 w-full border border-border rounded-md px-2 text-xs bg-surface text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand";
  const selectCls = "h-8 w-full border border-border rounded-md px-2 text-xs bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-brand";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Nome */}
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={filtros.nome}
            onChange={(e) => setFiltro("nome", e.target.value)}
            className={`${inputCls} min-w-40 max-w-56`}
          />
          {/* Unidade */}
          <select
            value={filtros.unidade}
            onChange={(e) => setFiltro("unidade", e.target.value)}
            className={`${selectCls} w-32`}
          >
            <option value="">Unidade</option>
            {unidades.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          {/* Preço */}
          <div className="flex items-center gap-1">
            <input
              type="text"
              inputMode="decimal"
              placeholder="Preço mín"
              value={filtros.precoMin}
              onChange={(e) => setFiltro("precoMin", e.target.value)}
              className={`${inputCls} w-24`}
            />
            <span className="text-xs text-muted">–</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Preço máx"
              value={filtros.precoMax}
              onChange={(e) => setFiltro("precoMax", e.target.value)}
              className={`${inputCls} w-24`}
            />
          </div>
          {/* Ativo */}
          <select
            value={filtros.ativo}
            onChange={(e) => setFiltro("ativo", e.target.value as Filtros["ativo"])}
            className={`${selectCls} w-28`}
          >
            <option value="">Status</option>
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
          {/* Limpar */}
          {temFiltroAtivo && (
            <button
              onClick={limparFiltros}
              className="h-8 px-3 text-xs text-muted hover:text-foreground border border-border rounded-md bg-surface hover:bg-surface-subtle transition-colors"
            >
              Limpar
            </button>
          )}
        </div>
        {!somenteLeitura && (
          <Button variant="secondary" size="sm" onClick={() => setImportarAberto(true)}>
            Importar planilha
          </Button>
        )}
      </div>

      {temFiltroAtivo && (
        <p className="text-xs text-muted">
          {filtrados.length} de {produtos.length} produto{produtos.length !== 1 ? "s" : ""}
        </p>
      )}

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            {!somenteLeitura && <col className="w-[4%]" />}
            <col className="w-[26%]" />
            <col className="w-[12%] hidden sm:table-column" />
            <col className="w-[18%]" />
            <col className="w-[15%] hidden md:table-column" />
            {!somenteLeitura && <col className="w-[25%]" />}
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-surface-subtle">
              {!somenteLeitura && (
                <th className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={filtrados.length > 0 && filtrados.every((p) => selecionados.has(p.id))}
                    onChange={alternarSelecionarTodos}
                    className="h-4 w-4 rounded border-border accent-brand cursor-pointer"
                    aria-label="Selecionar todos"
                  />
                </th>
              )}
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">Nome</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide hidden sm:table-cell">Unidade</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">Preço</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide hidden md:table-cell">Status</th>
              {!somenteLeitura && <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted uppercase tracking-wide">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={somenteLeitura ? 4 : 6} className="text-center py-10 text-muted text-sm">
                  {temFiltroAtivo ? "Nenhum produto corresponde aos filtros." : "Nenhum produto encontrado."}
                </td>
              </tr>
            )}
            {filtrados.map((produto) => {
              const emEdicao = editandoId === produto.id;
              const valoresEdicao = emEdicao ? editValues! : null;
              const precoInvalido = valoresEdicao !== null && (isNaN(parsePreco(valoresEdicao.preco_atual)) || parsePreco(valoresEdicao.preco_atual) < 0);

              return (
                <tr key={produto.id} className="border-b border-border last:border-0 hover:bg-surface-subtle transition-colors group">
                  {!somenteLeitura && (
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selecionados.has(produto.id)}
                        onChange={() => alternarSelecao(produto.id)}
                        className="h-4 w-4 rounded border-border accent-brand cursor-pointer"
                        aria-label={`Selecionar ${produto.nome}`}
                      />
                    </td>
                  )}
                  <td className="px-3 py-2.5 font-medium text-foreground truncate">{produto.nome}</td>
                  <td className="px-3 py-2.5 text-muted text-xs hidden sm:table-cell">{produto.unidade}</td>

                  <td className="px-3 py-2.5">
                    {emEdicao ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={valoresEdicao!.preco_atual}
                        onChange={(e) => setEditValues((v) => v ? { ...v, preco_atual: e.target.value } : v)}
                        className="w-full border border-brand rounded-md px-2 py-1 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    ) : (
                      <span className="font-semibold text-foreground">{formatMoeda(produto.preco_atual)}</span>
                    )}
                  </td>

                  <td className="px-3 py-2.5 hidden md:table-cell">
                    {emEdicao ? (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={valoresEdicao!.ativo}
                        onClick={() => setEditValues((v) => v ? { ...v, ativo: !v.ativo } : v)}
                        className={[
                          "relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand",
                          valoresEdicao!.ativo ? "bg-brand" : "bg-border",
                        ].join(" ")}
                      >
                        <span className={[
                          "inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5",
                          valoresEdicao!.ativo ? "translate-x-4" : "translate-x-0.5",
                        ].join(" ")} />
                      </button>
                    ) : somenteLeitura ? (
                      <span className={[
                        "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                        produto.ativo
                          ? "bg-[var(--success-bg,#f0fdf4)] text-success"
                          : "bg-surface-subtle text-muted",
                      ].join(" ")}>
                        <span className={["h-1.5 w-1.5 rounded-full", produto.ativo ? "bg-success" : "bg-muted"].join(" ")} />
                        {produto.ativo ? "Ativo" : "Inativo"}
                      </span>
                    ) : (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={produto.ativo}
                        title={produto.ativo ? "Ativo — clique para desativar" : "Inativo — clique para ativar"}
                        disabled={pending}
                        onClick={() => alternarAtivo(produto)}
                        className={[
                          "relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50",
                          produto.ativo ? "bg-emerald-500" : "bg-border",
                        ].join(" ")}
                      >
                        <span className={[
                          "inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5",
                          produto.ativo ? "translate-x-4" : "translate-x-0.5",
                        ].join(" ")} />
                      </button>
                    )}
                  </td>

                  {!somenteLeitura && (
                    <td className="px-3 py-2.5 text-right">
                      {emEdicao ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="ghost" onClick={cancelarEdicao}>
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={precoInvalido}
                            onClick={() => salvarEdicao(produto.id)}
                          >
                            Salvar
                          </Button>
                        </div>
                      ) : (
                        <button
                          disabled={!podeEditar}
                          onClick={() => iniciarEdicao(produto)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface text-foreground hover:bg-brand hover:text-white hover:border-brand transition-colors disabled:opacity-40"
                        >
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          Editar
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!somenteLeitura && selecionados.size > 0 && (
        <div className="sticky bottom-0 flex items-center justify-between gap-3 px-4 py-3 bg-surface border border-border rounded-xl shadow-lg">
          <p className="text-sm text-foreground">
            <span className="font-semibold">{selecionados.size}</span> produto{selecionados.size !== 1 ? "s" : ""} selecionado{selecionados.size !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => aplicarAcaoEmLote(true)}>
              Ativar selecionados
            </Button>
            <Button size="sm" variant="destructive" disabled={pending} onClick={() => aplicarAcaoEmLote(false)}>
              Desativar selecionados
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => setSelecionados(new Set())}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <ImportarModal
        aberto={importarAberto}
        onFechar={() => setImportarAberto(false)}
        produtos={produtos}
        onConcluido={onImportarConcluido}
      />
    </div>
  );
}
