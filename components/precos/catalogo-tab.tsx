"use client";

import { useState, useTransition } from "react";
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

export function CatalogoTab({ produtos: inicial }: CatalogoTabProps) {
  const [produtos, setProdutos] = useState<Produto[]>(inicial);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<EditState | null>(null);
  const [importarAberto, setImportarAberto] = useState(false);
  const [pending, startTransition] = useTransition();

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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={() => setImportarAberto(true)}>
          Importar planilha
        </Button>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-subtle">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Nome</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide hidden sm:table-cell">Unidade</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Preço Atual</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Estoque Atual</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide hidden md:table-cell">Ativo</th>
              <th className="px-4 py-3 w-36 text-right text-xs font-semibold text-muted uppercase tracking-wide">Ações</th>
            </tr>
          </thead>
          <tbody>
            {produtos.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-muted text-sm">
                  Nenhum produto encontrado.
                </td>
              </tr>
            )}
            {produtos.map((produto) => {
              const emEdicao = editandoId === produto.id;
              const valoresEdicao = emEdicao ? editValues! : null;
              const precoInvalido = valoresEdicao !== null && (isNaN(valoresEdicao.preco_atual) || valoresEdicao.preco_atual < 0);
              const estoqueInvalido = valoresEdicao !== null && (isNaN(valoresEdicao.estoque_atual) || valoresEdicao.estoque_atual < 0);

              return (
                <tr key={produto.id} className="border-b border-border last:border-0 hover:bg-surface-subtle transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{produto.nome}</td>
                  <td className="px-4 py-3 text-muted hidden sm:table-cell">{produto.unidade}</td>

                  <td className="px-4 py-3">
                    {emEdicao ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={valoresEdicao!.preco_atual}
                        onChange={(e) => setEditValues((v) => v ? { ...v, preco_atual: parseFloat(e.target.value) } : v)}
                        className="w-28 border border-border rounded-md px-2 py-1 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    ) : (
                      <span className="font-medium">{formatMoeda(produto.preco_atual)}</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {emEdicao ? (
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={valoresEdicao!.estoque_atual}
                        onChange={(e) => setEditValues((v) => v ? { ...v, estoque_atual: parseInt(e.target.value, 10) } : v)}
                        className="w-24 border border-border rounded-md px-2 py-1 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    ) : (
                      <span>{produto.estoque_atual} {produto.unidade}</span>
                    )}
                  </td>

                  <td className="px-4 py-3 hidden md:table-cell">
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
                      <span className={produto.ativo ? "text-success text-xs font-medium" : "text-muted text-xs"}>
                        {produto.ativo ? "Ativo" : "Inativo"}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {emEdicao ? (
                      <div className="flex items-center justify-end gap-2">
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
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!podeEditar}
                        onClick={() => iniciarEdicao(produto)}
                      >
                        Editar
                      </Button>
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
