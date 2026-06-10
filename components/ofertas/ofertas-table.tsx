"use client";

import { useState, useTransition } from "react";
import type { Produto, TipoProduto } from "@/lib/types";
import {
  criarOfertaKitAction,
  atualizarOfertaKitAction,
  deletarOfertaKitAction,
} from "@/app/(crm)/ofertas/actions";

interface Props {
  itens: Produto[];
}

const TIPO_LABEL: Record<string, string> = { oferta: "Oferta", kit: "Kit" };

const TIPO_BADGE: Record<string, string> = {
  oferta: "bg-amber-100 text-amber-700",
  kit: "bg-emerald-100 text-emerald-700",
};

// Nicho define a seção do SITE onde o item aparece.
// Dropdown fechado: valores fora desta lista deixariam o item invisível no site.
const NICHO_OPTIONS = [
  { value: "acougue", label: "Açougue (site)" },
  { value: "padaria", label: "Padaria (site)" },
  { value: "churrasco", label: "Churrasco (site)" },
] as const;

const NICHO_LABEL: Record<string, string> = {
  acougue: "Açougue",
  padaria: "Padaria",
  churrasco: "Churrasco",
};

function nichoPadrao(tipo: string): string {
  return tipo === "kit" ? "churrasco" : "acougue";
}

const VAZIO: Omit<Produto, "id" | "criado_em"> = {
  nome: "",
  preco_atual: 0,
  unidade: "kg",
  tipo: "oferta",
  descricao: "",
  validade: "",
  categoria: "ofertas",
  ativo: true,
  nicho: "acougue",
  imagem_url: null,
};

export function OfertasTable({ itens }: Props) {
  const [filtro, setFiltro] = useState<"todos" | "oferta" | "kit">("todos");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Produto>>({});
  const [criando, setCriando] = useState(false);
  const [novoForm, setNovoForm] = useState({ ...VAZIO });
  const [isPending, startTransition] = useTransition();

  const visíveis = itens.filter((i) => filtro === "todos" || i.tipo === filtro);

  function iniciarEdicao(item: Produto) {
    setEditandoId(item.id);
    setEditForm({ ...item });
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setEditForm({});
  }

  function salvarEdicao() {
    if (!editandoId) return;
    startTransition(async () => {
      await atualizarOfertaKitAction(editandoId, {
        nome: editForm.nome,
        preco_atual: Number(editForm.preco_atual),
        unidade: editForm.unidade ?? "kg",
        descricao: editForm.descricao ?? null,
        validade: editForm.validade ?? null,
        ativo: editForm.ativo ?? true,
        nicho: editForm.nicho ?? nichoPadrao(editForm.tipo ?? "oferta"),
      });
      cancelarEdicao();
    });
  }

  function salvarNovo() {
    startTransition(async () => {
      await criarOfertaKitAction({
        nome: novoForm.nome,
        preco_atual: Number(novoForm.preco_atual),
        unidade: novoForm.unidade,
        tipo: novoForm.tipo as TipoProduto,
        descricao: novoForm.descricao || null,
        validade: novoForm.validade || null,
        categoria: novoForm.tipo === "kit" ? "kits" : "ofertas",
        ativo: true,
        nicho: novoForm.nicho ?? nichoPadrao(novoForm.tipo),
      });
      setCriando(false);
      setNovoForm({ ...VAZIO });
    });
  }

  function confirmarDelete(item: Produto) {
    if (!confirm(`Excluir "${item.nome}"?`)) return;
    startTransition(async () => {
      await deletarOfertaKitAction(item.id);
    });
  }

  return (
    <div className="space-y-4">
      {/* Filtros + botão novo */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          {(["todos", "oferta", "kit"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFiltro(t)}
              className={[
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                filtro === t
                  ? "bg-brand-50 text-brand-700"
                  : "text-muted hover:bg-surface-subtle hover:text-foreground",
              ].join(" ")}
            >
              {t === "todos" ? "Todos" : TIPO_LABEL[t]}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setCriando(true); setEditandoId(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand/90 transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Novo
        </button>
      </div>

      <p className="text-xs text-muted">{visíveis.length} item{visíveis.length !== 1 ? "s" : ""}</p>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted text-xs uppercase">
              <th className="text-left px-4 py-3 font-medium">Nome</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Tipo</th>
              <th className="text-left px-4 py-3 font-medium">Preço</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Descrição</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Validade</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Ativo</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {/* Linha de novo item */}
            {criando && (
              <tr className="border-b border-border bg-brand-50/40">
                <td className="px-4 py-2">
                  <input
                    className="w-full border border-border rounded-md px-2 py-1 text-sm bg-surface"
                    placeholder="Nome"
                    value={novoForm.nome}
                    onChange={(e) => setNovoForm({ ...novoForm, nome: e.target.value })}
                  />
                </td>
                <td className="px-4 py-2 hidden sm:table-cell">
                  <div className="flex flex-col gap-1">
                    <select
                      className="border border-border rounded-md px-2 py-1 text-sm bg-surface"
                      value={novoForm.tipo}
                      onChange={(e) => {
                        const tipo = e.target.value as TipoProduto;
                        setNovoForm({ ...novoForm, tipo, nicho: nichoPadrao(tipo) });
                      }}
                    >
                      <option value="oferta">Oferta</option>
                      <option value="kit">Kit</option>
                    </select>
                    <select
                      className="border border-border rounded-md px-2 py-1 text-xs bg-surface"
                      value={novoForm.nicho ?? nichoPadrao(novoForm.tipo)}
                      onChange={(e) => setNovoForm({ ...novoForm, nicho: e.target.value })}
                      title="Seção do site onde o item aparece"
                    >
                      {NICHO_OPTIONS.map((n) => (
                        <option key={n.value} value={n.value}>{n.label}</option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1">
                    <span className="text-muted text-xs">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      className="w-24 border border-border rounded-md px-2 py-1 text-sm bg-surface"
                      placeholder="0,00"
                      value={novoForm.preco_atual}
                      onChange={(e) => setNovoForm({ ...novoForm, preco_atual: Number(e.target.value) })}
                    />
                    <select
                      className="border border-border rounded-md px-2 py-1 text-sm bg-surface"
                      value={novoForm.unidade}
                      onChange={(e) => setNovoForm({ ...novoForm, unidade: e.target.value })}
                    >
                      <option value="kg">kg</option>
                      <option value="kit">kit</option>
                      <option value="un">un</option>
                    </select>
                  </div>
                </td>
                <td className="px-4 py-2 hidden md:table-cell">
                  <input
                    className="w-full border border-border rounded-md px-2 py-1 text-sm bg-surface"
                    placeholder="Composição ou descrição"
                    value={novoForm.descricao ?? ""}
                    onChange={(e) => setNovoForm({ ...novoForm, descricao: e.target.value })}
                  />
                </td>
                <td className="px-4 py-2 hidden lg:table-cell">
                  <input
                    className="w-32 border border-border rounded-md px-2 py-1 text-sm bg-surface"
                    placeholder="ex: até domingo"
                    value={novoForm.validade ?? ""}
                    onChange={(e) => setNovoForm({ ...novoForm, validade: e.target.value })}
                  />
                </td>
                <td className="px-4 py-2 hidden sm:table-cell" />
                <td className="px-4 py-2">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={salvarNovo}
                      disabled={isPending || !novoForm.nome}
                      className="text-xs px-2 py-1 rounded bg-brand text-white font-medium hover:bg-brand/90 disabled:opacity-50"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => setCriando(false)}
                      className="text-xs px-2 py-1 rounded bg-surface-subtle text-muted hover:text-foreground"
                    >
                      Cancelar
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {visíveis.length === 0 && !criando && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted text-sm">
                  Nenhum item encontrado.
                </td>
              </tr>
            )}

            {visíveis.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface-subtle/50">
                {editandoId === item.id ? (
                  <>
                    <td className="px-4 py-2">
                      <input
                        className="w-full border border-border rounded-md px-2 py-1 text-sm bg-surface"
                        value={editForm.nome ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                      />
                    </td>
                    <td className="px-4 py-2 hidden sm:table-cell">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_BADGE[item.tipo]}`}>
                          {TIPO_LABEL[item.tipo]}
                        </span>
                        <select
                          className="border border-border rounded-md px-2 py-1 text-xs bg-surface"
                          value={editForm.nicho ?? nichoPadrao(item.tipo)}
                          onChange={(e) => setEditForm({ ...editForm, nicho: e.target.value })}
                          title="Seção do site onde o item aparece"
                        >
                          {NICHO_OPTIONS.map((n) => (
                            <option key={n.value} value={n.value}>{n.label}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        <span className="text-muted text-xs">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          className="w-24 border border-border rounded-md px-2 py-1 text-sm bg-surface"
                          value={editForm.preco_atual ?? 0}
                          onChange={(e) => setEditForm({ ...editForm, preco_atual: Number(e.target.value) })}
                        />
                        <select
                          className="border border-border rounded-md px-2 py-1 text-sm bg-surface"
                          value={editForm.unidade ?? "kg"}
                          onChange={(e) => setEditForm({ ...editForm, unidade: e.target.value })}
                        >
                          <option value="kg">kg</option>
                          <option value="kit">kit</option>
                          <option value="un">un</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-2 hidden md:table-cell">
                      <input
                        className="w-full border border-border rounded-md px-2 py-1 text-sm bg-surface"
                        value={editForm.descricao ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
                      />
                    </td>
                    <td className="px-4 py-2 hidden lg:table-cell">
                      <input
                        className="w-32 border border-border rounded-md px-2 py-1 text-sm bg-surface"
                        placeholder="ex: até domingo"
                        value={editForm.validade ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, validade: e.target.value })}
                      />
                    </td>
                    <td className="px-4 py-2 hidden sm:table-cell">
                      <input
                        type="checkbox"
                        checked={editForm.ativo ?? true}
                        onChange={(e) => setEditForm({ ...editForm, ativo: e.target.checked })}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={salvarEdicao}
                          disabled={isPending}
                          className="text-xs px-2 py-1 rounded bg-brand text-white font-medium hover:bg-brand/90 disabled:opacity-50"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={cancelarEdicao}
                          className="text-xs px-2 py-1 rounded bg-surface-subtle text-muted hover:text-foreground"
                        >
                          Cancelar
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium text-foreground">{item.nome}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex flex-col gap-0.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_BADGE[item.tipo]}`}>
                          {TIPO_LABEL[item.tipo]}
                        </span>
                        <span className="text-[10px] text-muted">
                          {item.nicho ? `Site: ${NICHO_LABEL[item.nicho] ?? item.nicho}` : "Fora do site"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      R$ {Number(item.preco_atual).toFixed(2).replace(".", ",")}
                      <span className="text-muted text-xs ml-1">/{item.unidade}</span>
                    </td>
                    <td className="px-4 py-3 text-muted hidden md:table-cell max-w-xs truncate">
                      {item.descricao ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted hidden lg:table-cell">
                      {item.validade ?? "—"}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`inline-block h-2 w-2 rounded-full ${item.ativo ? "bg-emerald-500" : "bg-zinc-300"}`} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => iniciarEdicao(item)}
                          className="text-xs px-2 py-1 rounded bg-surface-subtle text-muted hover:text-foreground transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => confirmarDelete(item)}
                          disabled={isPending}
                          className="text-xs px-2 py-1 rounded text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
