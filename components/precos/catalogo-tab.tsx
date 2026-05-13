"use client";

import { useState, useTransition, useMemo } from "react";
import type { Produto } from "@/lib/types";
import { editarProdutoAction } from "@/app/(crm)/precos/actions";
import { Button } from "@/components/ui/button";
import { ImportarModal } from "./importar-modal";

interface CatalogoTabProps {
  produtos: Produto[];
}

function formatMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface EditState {
  preco_atual: number;
  estoque_atual: number;
  ativo: boolean;
}

interface Filtros {
  nome: string;
  unidade: string;
  precoMin: string;
  precoMax: string;
  estoqueMin: string;
  estoqueMax: string;
  ativo: "" | "true" | "false";
}

const filtrosIniciais: Filtros = {
  nome: "",
  unidade: "",
  precoMin: "",
  precoMax: "",
  estoqueMin: "",
  estoqueMax: "",
  ativo: "",
};

export function CatalogoTab({ produtos: inicial }: CatalogoTabProps) {
  const [produtos, setProdutos] = useState<Produto[]>(inicial);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<EditState | null>(null);
  const [importarAberto, setImportarAberto] = useState(false);
  const [pending, startTransition] = useTransition();
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciais);

  const unidades = useMemo(
    () => Array.from(new Set(produtos.map((p) => p.unidade))).sort(),
    [produtos]
  );

  const filtrados = useMemo(() => {
    return produtos.filter((p) => {
      if (filtros.nome && !p.nome.toLowerCase().includes(filtros.nome.toLowerCase())) return false;
      if (filtros.unidade && p.unidade !== filtros.unidade) return false;
      if (filtros.precoMin !== "" && p.preco_atual < parseFloat(filtros.precoMin)) return false;
      if (filtros.precoMax !== "" && p.preco_atual > parseFloat(filtros.precoMax)) return false;
      if (filtros.estoqueMin !== "" && p.estoque_atual < parseFloat(filtros.estoqueMin)) return false;
      if (filtros.estoqueMax !== "" && p.estoque_atual > parseFloat(filtros.estoqueMax)) return false;
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

  function iniciarEdicao(produto: Produto) {
    setEditandoId(produto.id);
    setEditValues({
      preco_atual: produto.preco_atual,
      estoque_atual: produto.estoque_atual,
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
      preco_atual: editValues.preco_atual,
      estoque_atual: editValues.estoque_atual,
      ativo: editValues.ativo,
    };
    setProdutos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...payload } : p))
    );
    setEditandoId(null);
    setEditValues(null);
    startTransition(() => editarProdutoAction(id, payload));
  }

  function onImportarConcluido(atualizados: { produto_id: string; preco_atual: number; estoque_atual: number }[]) {
    setProdutos((prev) =>
      prev.map((p) => {
        const atualizado = atualizados.find((a) => a.produto_id === p.id);
        return atualizado ? { ...p, preco_atual: atualizado.preco_atual, estoque_atual: atualizado.estoque_atual } : p;
      })
    );
  }

  const podeEditar = !pending;

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
              type="number"
              min="0"
              step="0.01"
              placeholder="Preço mín"
              value={filtros.precoMin}
              onChange={(e) => setFiltro("precoMin", e.target.value)}
              className={`${inputCls} w-24`}
            />
            <span className="text-xs text-muted">–</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Preço máx"
              value={filtros.precoMax}
              onChange={(e) => setFiltro("precoMax", e.target.value)}
              className={`${inputCls} w-24`}
            />
          </div>
          {/* Estoque */}
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Estoque mín"
              value={filtros.estoqueMin}
              onChange={(e) => setFiltro("estoqueMin", e.target.value)}
              className={`${inputCls} w-24`}
            />
            <span className="text-xs text-muted">–</span>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Estoque máx"
              value={filtros.estoqueMax}
              onChange={(e) => setFiltro("estoqueMax", e.target.value)}
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
        <Button variant="secondary" size="sm" onClick={() => setImportarAberto(true)}>
          Importar planilha
        </Button>
      </div>

      {temFiltroAtivo && (
        <p className="text-xs text-muted">
          {filtrados.length} de {produtos.length} produto{produtos.length !== 1 ? "s" : ""}
        </p>
      )}

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[35%]" />
            <col className="w-[10%] hidden sm:table-column" />
            <col className="w-[15%]" />
            <col className="w-[15%]" />
            <col className="w-[10%] hidden md:table-column" />
            <col className="w-[15%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-surface-subtle">
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">Nome</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide hidden sm:table-cell">Unidade</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">Preço</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">Estoque</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide hidden md:table-cell">Status</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted uppercase tracking-wide">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-muted text-sm">
                  {temFiltroAtivo ? "Nenhum produto corresponde aos filtros." : "Nenhum produto encontrado."}
                </td>
              </tr>
            )}
            {filtrados.map((produto) => {
              const emEdicao = editandoId === produto.id;
              const valoresEdicao = emEdicao ? editValues! : null;
              const precoInvalido = valoresEdicao !== null && (isNaN(valoresEdicao.preco_atual) || valoresEdicao.preco_atual < 0);
              const estoqueInvalido = valoresEdicao !== null && (isNaN(valoresEdicao.estoque_atual) || valoresEdicao.estoque_atual < 0);

              return (
                <tr key={produto.id} className="border-b border-border last:border-0 hover:bg-surface-subtle transition-colors group">
                  <td className="px-3 py-2.5 font-medium text-foreground truncate">{produto.nome}</td>
                  <td className="px-3 py-2.5 text-muted text-xs hidden sm:table-cell">{produto.unidade}</td>

                  <td className="px-3 py-2.5">
                    {emEdicao ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={valoresEdicao!.preco_atual}
                        onChange={(e) => setEditValues((v) => v ? { ...v, preco_atual: parseFloat(e.target.value) } : v)}
                        className="w-full border border-brand rounded-md px-2 py-1 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    ) : (
                      <span className="font-semibold text-foreground">{formatMoeda(produto.preco_atual)}</span>
                    )}
                  </td>

                  <td className="px-3 py-2.5">
                    {emEdicao ? (
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={valoresEdicao!.estoque_atual}
                        onChange={(e) => setEditValues((v) => v ? { ...v, estoque_atual: parseInt(e.target.value, 10) } : v)}
                        className="w-full border border-brand rounded-md px-2 py-1 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    ) : (
                      <span className="text-foreground">{produto.estoque_atual} <span className="text-muted text-xs">{produto.unidade}</span></span>
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
                    ) : (
                      <span className={[
                        "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                        produto.ativo
                          ? "bg-[var(--success-bg,#f0fdf4)] text-success"
                          : "bg-surface-subtle text-muted",
                      ].join(" ")}>
                        <span className={["h-1.5 w-1.5 rounded-full", produto.ativo ? "bg-success" : "bg-muted"].join(" ")} />
                        {produto.ativo ? "Ativo" : "Inativo"}
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-2.5 text-right">
                    {emEdicao ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="ghost" onClick={cancelarEdicao}>
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={precoInvalido || estoqueInvalido}
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ImportarModal
        aberto={importarAberto}
        onFechar={() => setImportarAberto(false)}
        produtos={produtos}
        onConcluido={onImportarConcluido}
      />
    </div>
  );
}
