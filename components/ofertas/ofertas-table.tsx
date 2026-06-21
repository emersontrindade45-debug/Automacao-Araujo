"use client";

import { useState, useTransition, useMemo } from "react";
import type { Produto, TipoProduto } from "@/lib/types";
import {
  criarOfertaKitAction,
  atualizarOfertaKitAction,
  deletarOfertaKitAction,
  ativarDesativarOfertasKitsAction,
} from "@/app/(crm)/ofertas/actions";
import { Button } from "@/components/ui/button";
import { SelectCheckbox } from "@/components/ui/select-checkbox";

interface Props {
  itens: Produto[];
  tipoFixo?: TipoProduto;
}

const TIPO_LABEL: Record<string, string> = { oferta: "Oferta", kit: "Kit", padaria: "Padaria" };

const TIPO_BADGE: Record<string, string> = {
  oferta: "bg-amber-100 text-amber-700",
  kit: "bg-emerald-100 text-emerald-700",
  padaria: "bg-orange-100 text-orange-700",
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
  if (tipo === "kit") return "churrasco";
  if (tipo === "padaria") return "padaria";
  return "acougue";
}

// Aceita vírgula ou ponto como separador decimal (ex: "12,50" ou "12.50")
function parsePreco(v: string): number {
  return parseFloat(v.trim().replace(",", "."));
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

export function OfertasTable({ itens, tipoFixo }: Props) {
  const [filtro, setFiltro] = useState<"todos" | "oferta" | "kit" | "padaria">("todos");
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciais);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Produto>>({});
  const [criando, setCriando] = useState(false);
  const [novoForm, setNovoForm] = useState({ ...VAZIO, tipo: tipoFixo ?? VAZIO.tipo, nicho: nichoPadrao(tipoFixo ?? VAZIO.tipo) });
  // Preços como texto durante a digitação para aceitar vírgula (12,50)
  const [novoPrecoTxt, setNovoPrecoTxt] = useState("");
  const [editPrecoTxt, setEditPrecoTxt] = useState("");
  const [isPending, startTransition] = useTransition();
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [ultimoSelecionadoId, setUltimoSelecionadoId] = useState<string | null>(null);

  const unidades = useMemo(
    () => Array.from(new Set(itens.map((i) => i.unidade))).sort(),
    [itens]
  );

  const visíveis = itens.filter((i) => {
    if (tipoFixo ? i.tipo !== tipoFixo : filtro !== "todos" && i.tipo !== filtro) return false;
    if (filtros.nome && !i.nome.toLowerCase().includes(filtros.nome.toLowerCase())) return false;
    if (filtros.unidade && i.unidade !== filtros.unidade) return false;
    if (filtros.precoMin !== "" && i.preco_atual < parsePreco(filtros.precoMin)) return false;
    if (filtros.precoMax !== "" && i.preco_atual > parsePreco(filtros.precoMax)) return false;
    if (filtros.ativo !== "" && String(i.ativo) !== filtros.ativo) return false;
    return true;
  });

  function setFiltroCampo<K extends keyof Filtros>(key: K, value: Filtros[K]) {
    setFiltros((prev) => ({ ...prev, [key]: value }));
  }

  function limparFiltros() {
    setFiltros(filtrosIniciais);
  }

  const temFiltroAtivo = Object.values(filtros).some((v) => v !== "");

  function alternarSelecao(id: string, shiftKey: boolean) {
    if (shiftKey && ultimoSelecionadoId) {
      const ids = visíveis.map((i) => i.id);
      const i1 = ids.indexOf(ultimoSelecionadoId);
      const i2 = ids.indexOf(id);
      if (i1 !== -1 && i2 !== -1) {
        const [inicio, fim] = i1 < i2 ? [i1, i2] : [i2, i1];
        const intervalo = ids.slice(inicio, fim + 1);
        setSelecionados((prev) => {
          const novo = new Set(prev);
          intervalo.forEach((itemId) => novo.add(itemId));
          return novo;
        });
        setUltimoSelecionadoId(id);
        return;
      }
    }

    setSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
    setUltimoSelecionadoId(id);
  }

  function alternarSelecionarTodos() {
    setSelecionados((prev) => {
      const todosVisiveisSelecionados = visíveis.every((i) => prev.has(i.id));
      if (todosVisiveisSelecionados) {
        const novo = new Set(prev);
        visíveis.forEach((i) => novo.delete(i.id));
        return novo;
      }
      const novo = new Set(prev);
      visíveis.forEach((i) => novo.add(i.id));
      return novo;
    });
  }

  function aplicarAcaoEmLote(ativo: boolean) {
    const ids = Array.from(selecionados);
    if (ids.length === 0) return;
    const acaoLabel = ativo ? "ativar" : "desativar";
    if (!confirm(`${ativo ? "Ativar" : "Desativar"} ${ids.length} item${ids.length !== 1 ? "ns" : ""} selecionado${ids.length !== 1 ? "s" : ""}?`)) return;

    startTransition(async () => {
      try {
        await ativarDesativarOfertasKitsAction(ids, ativo);
        setSelecionados(new Set());
      } catch {
        alert(`Falha ao ${acaoLabel} os itens selecionados. Tente novamente.`);
      }
    });
  }

  function iniciarEdicao(item: Produto) {
    setEditandoId(item.id);
    setEditForm({ ...item });
    setEditPrecoTxt(String(item.preco_atual).replace(".", ","));
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setEditForm({});
  }

  function salvarEdicao() {
    if (!editandoId) return;
    const tipo = (editForm.tipo as TipoProduto) ?? "oferta";
    startTransition(async () => {
      await atualizarOfertaKitAction(editandoId, {
        nome: editForm.nome,
        preco_atual: parsePreco(editPrecoTxt),
        unidade: editForm.unidade ?? "kg",
        descricao: editForm.descricao ?? null,
        validade: editForm.validade ?? null,
        ativo: editForm.ativo ?? true,
        tipo,
        categoria: categoriaDoTipo(tipo),
        nicho: editForm.nicho ?? nichoPadrao(tipo),
      });
      cancelarEdicao();
    });
  }

  function categoriaDoTipo(tipo: string): string {
    if (tipo === "kit") return "kits";
    if (tipo === "padaria") return "padaria";
    return "ofertas";
  }

  function salvarNovo() {
    startTransition(async () => {
      await criarOfertaKitAction({
        nome: novoForm.nome,
        preco_atual: parsePreco(novoPrecoTxt),
        unidade: novoForm.unidade,
        tipo: novoForm.tipo as TipoProduto,
        descricao: novoForm.descricao || null,
        validade: novoForm.validade || null,
        categoria: categoriaDoTipo(novoForm.tipo),
        ativo: true,
        nicho: novoForm.nicho ?? nichoPadrao(novoForm.tipo),
      });
      setCriando(false);
      setNovoForm({ ...VAZIO, tipo: tipoFixo ?? VAZIO.tipo, nicho: nichoPadrao(tipoFixo ?? VAZIO.tipo) });
      setNovoPrecoTxt("");
    });
  }

  // Liga/desliga o item direto da listagem — reflete no site na hora
  function alternarAtivo(item: Produto) {
    startTransition(async () => {
      await atualizarOfertaKitAction(item.id, { ativo: !item.ativo });
    });
  }

  function confirmarDelete(item: Produto) {
    if (!confirm(`Excluir "${item.nome}"?`)) return;
    startTransition(async () => {
      await deletarOfertaKitAction(item.id);
    });
  }

  const inputCls = "h-8 w-full border border-border rounded-md px-2 text-xs bg-surface text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand";
  const selectCls = "h-8 w-full border border-border rounded-md px-2 text-xs bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-brand";

  return (
    <div className="space-y-4">
      {/* Filtros + botão novo */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {!tipoFixo && (["todos", "oferta", "kit"] as const).map((t) => (
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
          {/* Nome */}
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={filtros.nome}
            onChange={(e) => setFiltroCampo("nome", e.target.value)}
            className={`${inputCls} min-w-40 max-w-56`}
          />
          {/* Unidade */}
          <select
            value={filtros.unidade}
            onChange={(e) => setFiltroCampo("unidade", e.target.value)}
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
              onChange={(e) => setFiltroCampo("precoMin", e.target.value)}
              className={`${inputCls} w-24`}
            />
            <span className="text-xs text-muted">–</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Preço máx"
              value={filtros.precoMax}
              onChange={(e) => setFiltroCampo("precoMax", e.target.value)}
              className={`${inputCls} w-24`}
            />
          </div>
          {/* Status */}
          <select
            value={filtros.ativo}
            onChange={(e) => setFiltroCampo("ativo", e.target.value as Filtros["ativo"])}
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

      <p className="text-xs text-muted">
        {temFiltroAtivo ? `${visíveis.length} de ${itens.filter((i) => (tipoFixo ? i.tipo === tipoFixo : true)).length}` : visíveis.length} item{visíveis.length !== 1 ? "s" : ""}
      </p>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted text-xs uppercase">
              <th className="px-4 py-3">
                <SelectCheckbox
                  checked={visíveis.length > 0 && visíveis.every((i) => selecionados.has(i.id))}
                  onSelect={alternarSelecionarTodos}
                  ariaLabel="Selecionar todos"
                />
              </th>
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
                <td className="px-4 py-2" />
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
                    {!tipoFixo && (
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
                    )}
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
                      type="text"
                      inputMode="decimal"
                      className="w-24 border border-border rounded-md px-2 py-1 text-sm bg-surface"
                      placeholder="0,00"
                      value={novoPrecoTxt}
                      onChange={(e) => setNovoPrecoTxt(e.target.value)}
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
                      disabled={isPending || !novoForm.nome || isNaN(parsePreco(novoPrecoTxt)) || parsePreco(novoPrecoTxt) < 0}
                      className="text-xs px-2 py-1 rounded bg-brand text-white font-medium hover:bg-brand/90 disabled:opacity-50"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => { setCriando(false); setNovoForm({ ...VAZIO, tipo: tipoFixo ?? VAZIO.tipo, nicho: nichoPadrao(tipoFixo ?? VAZIO.tipo) }); setNovoPrecoTxt(""); }}
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
                <td colSpan={8} className="px-4 py-8 text-center text-muted text-sm">
                  {temFiltroAtivo ? "Nenhum item corresponde aos filtros." : "Nenhum item encontrado."}
                </td>
              </tr>
            )}

            {visíveis.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface-subtle/50">
                <td className="px-4 py-2">
                  <SelectCheckbox
                    checked={selecionados.has(item.id)}
                    onSelect={(shiftKey) => alternarSelecao(item.id, shiftKey)}
                    ariaLabel={`Selecionar ${item.nome}`}
                  />
                </td>
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
                        <select
                          className="border border-border rounded-md px-2 py-1 text-xs bg-surface"
                          value={editForm.tipo ?? item.tipo}
                          onChange={(e) => {
                            const tipo = e.target.value as TipoProduto;
                            setEditForm({ ...editForm, tipo, nicho: nichoPadrao(tipo) });
                          }}
                          title="Mover item entre Ofertas, Kits ou Padaria"
                        >
                          <option value="oferta">Oferta</option>
                          <option value="kit">Kit</option>
                          <option value="padaria">Padaria</option>
                        </select>
                        <select
                          className="border border-border rounded-md px-2 py-1 text-xs bg-surface"
                          value={editForm.nicho ?? nichoPadrao(editForm.tipo ?? item.tipo)}
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
                          type="text"
                          inputMode="decimal"
                          placeholder="0,00"
                          className="w-24 border border-border rounded-md px-2 py-1 text-sm bg-surface"
                          value={editPrecoTxt}
                          onChange={(e) => setEditPrecoTxt(e.target.value)}
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
                          disabled={isPending || isNaN(parsePreco(editPrecoTxt)) || parsePreco(editPrecoTxt) < 0}
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
                      <button
                        type="button"
                        role="switch"
                        aria-checked={item.ativo}
                        title={item.ativo ? "Ativo — clique para desativar" : "Inativo — clique para ativar"}
                        disabled={isPending}
                        onClick={() => alternarAtivo(item)}
                        className={[
                          "relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50",
                          item.ativo ? "bg-emerald-500" : "bg-border",
                        ].join(" ")}
                      >
                        <span className={[
                          "inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5",
                          item.ativo ? "translate-x-4" : "translate-x-0.5",
                        ].join(" ")} />
                      </button>
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

      {selecionados.size > 0 && (
        <div className="sticky bottom-0 flex items-center justify-between gap-3 px-4 py-3 bg-surface border border-border rounded-xl shadow-lg">
          <p className="text-sm text-foreground">
            <span className="font-semibold">{selecionados.size}</span> item{selecionados.size !== 1 ? "ns" : ""} selecionado{selecionados.size !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" disabled={isPending} onClick={() => aplicarAcaoEmLote(true)}>
              Ativar selecionados
            </Button>
            <Button size="sm" variant="destructive" disabled={isPending} onClick={() => aplicarAcaoEmLote(false)}>
              Desativar selecionados
            </Button>
            <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setSelecionados(new Set())}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
