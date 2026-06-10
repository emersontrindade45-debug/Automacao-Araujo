"use client";

import { useState, useRef } from "react";
import type { Produto } from "@/lib/types";
import type { LinhaPlanilha } from "@/lib/supabase/queries/produtos";
import { importarProdutosAction } from "@/app/(crm)/precos/actions";
import { Button } from "@/components/ui/button";

interface ImportarModalProps {
  aberto: boolean;
  onFechar: () => void;
  produtos: Produto[];
  onConcluido: (atualizados: LinhaPlanilha[]) => void;
}

interface LinhaPrevia {
  nome: string;
  unidade: string | null;
  preco_atual: number | null;
  categoria: string | null;
  nicho: string | null;
  validade: string | null;
  erro: string | null;
}

function parseNumero(v: unknown): number | null {
  const n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) || n < 0 ? null : n;
}

// Nichos aceitos — definem em qual seção do SITE o item aparece.
// Valores fora desta lista deixariam o item invisível no site.
const NICHOS_VALIDOS = ["acougue", "padaria", "churrasco"] as const;

function parseNicho(v: unknown): { valor: string | null; erro: string | null } {
  const raw = String(v ?? "").trim();
  if (!raw) return { valor: null, erro: null };
  const norm = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (!(NICHOS_VALIDOS as readonly string[]).includes(norm)) {
    return {
      valor: null,
      erro: `nicho "${raw}" inválido — use exatamente: acougue, padaria ou churrasco (ou deixe vazio para produtos comuns)`,
    };
  }
  return { valor: norm, erro: null };
}

async function parseArquivo(file: File, produtosRef: Produto[]): Promise<LinhaPrevia[]> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  let rows: Record<string, unknown>[] = [];

  if (ext === "csv") {
    const Papa = (await import("papaparse")).default;
    const text = await file.text();
    const result = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
    rows = result.data;
  } else if (ext === "xlsx" || ext === "xls") {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
  } else {
    return [];
  }

  return rows.map((row) => {
    const nome = String(row["nome"] ?? row["Nome"] ?? "").trim();
    if (!nome) return { nome: "(vazio)", unidade: null, preco_atual: null, categoria: null, nicho: null, validade: null, erro: "Nome obrigatório" };

    const unidade = String(row["unidade"] ?? row["Unidade"] ?? "").trim() || null;
    if (!unidade) return { nome, unidade: null, preco_atual: null, categoria: null, nicho: null, validade: null, erro: "Unidade obrigatória (ex: kg, unidade, pacote)" };

    const preco_atual = parseNumero(row["preco_atual"] ?? row["Preço Atual"] ?? row["preco"] ?? row["Preco"]);

    if (preco_atual === null) return { nome, unidade, preco_atual: null, categoria: null, nicho: null, validade: null, erro: "preco_atual inválido (deve ser número >= 0)" };

    const categoria = String(row["categoria"] ?? row["Categoria"] ?? "").trim() || null;

    const nichoParse = parseNicho(row["nicho"] ?? row["Nicho"]);
    if (nichoParse.erro) return { nome, unidade, preco_atual, categoria, nicho: null, validade: null, erro: nichoParse.erro };

    const validade = String(row["validade"] ?? row["Validade"] ?? "").trim() || null;

    return { nome, unidade, preco_atual, categoria, nicho: nichoParse.valor, validade, erro: null };
  });
}

function formatMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ImportarModal({ aberto, onFechar, produtos, onConcluido }: ImportarModalProps) {
  const [previa, setPrevia] = useState<LinhaPrevia[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [pending, setPending] = useState(false);
  const [erroImport, setErroImport] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!aberto) return null;

  async function onArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCarregando(true);
    const linhas = await parseArquivo(file, produtos);
    setPrevia(linhas);
    setCarregando(false);
  }

  function fechar() {
    setPrevia(null);
    setErroImport(null);
    if (inputRef.current) inputRef.current.value = "";
    onFechar();
  }

  const validas = previa?.filter((l) => l.erro === null && l.unidade !== null) ?? [];
  const comErro = previa?.filter((l) => l.erro !== null) ?? [];

  async function confirmar() {
    const linhas: LinhaPlanilha[] = validas.map((l) => ({
      nome: l.nome,
      unidade: l.unidade!,
      preco_atual: l.preco_atual!,
      categoria: l.categoria,
      nicho: l.nicho,
      validade: l.validade,
    }));
    setPending(true);
    setErroImport(null);
    try {
      await importarProdutosAction(linhas);
      onConcluido(linhas);
      fechar();
    } catch (e) {
      setErroImport(e instanceof Error ? e.message : "Erro desconhecido ao importar");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Importar planilha</h2>
          <button onClick={fechar} className="text-muted hover:text-foreground transition-colors">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {!previa && (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                Selecione um arquivo <strong>.csv</strong> ou <strong>.xlsx</strong> com as colunas:
                <code className="ml-1 px-1.5 py-0.5 bg-surface-subtle rounded text-xs">nome</code>,{" "}
                <code className="px-1.5 py-0.5 bg-surface-subtle rounded text-xs">unidade</code>,{" "}
                <code className="px-1.5 py-0.5 bg-surface-subtle rounded text-xs">preco_atual</code>,{" "}
                <code className="px-1.5 py-0.5 bg-surface-subtle rounded text-xs">categoria</code>,{" "}
                <code className="px-1.5 py-0.5 bg-surface-subtle rounded text-xs">nicho</code>,{" "}
                <code className="px-1.5 py-0.5 bg-surface-subtle rounded text-xs">validade</code>.
                {" "}Esta importação <strong>substitui todo o catálogo</strong>: produtos da planilha serão criados ou atualizados, e os que não estiverem na planilha serão removidos. Itens com categoria <em>ofertas</em> ou <em>kits</em> aparecem na página Ofertas e Kits e não são removidos pela importação (exclua-os por lá). As colunas <em>categoria</em>, <em>nicho</em> e <em>validade</em> são opcionais.
              </p>
              <div className="text-xs text-muted bg-surface-subtle border border-border rounded-lg p-3 space-y-1">
                <p className="font-semibold text-foreground">Coluna nicho — define a seção do SITE onde o item aparece:</p>
                <p><code className="px-1 py-0.5 bg-surface rounded">acougue</code> → seção Ofertas Açougue (para itens com categoria <em>ofertas</em>)</p>
                <p><code className="px-1 py-0.5 bg-surface rounded">padaria</code> → seção Ofertas Padaria (para itens com categoria <em>ofertas</em>)</p>
                <p><code className="px-1 py-0.5 bg-surface rounded">churrasco</code> → seção Kits Churrasco (para itens com categoria <em>kits</em>)</p>
                <p>Deixe <strong>vazio</strong> para produtos comuns do catálogo. Qualquer outra palavra será rejeitada na importação. Se a coluna vier vazia em um item que já tem nicho, o valor atual é mantido.</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const XLSX = await import("xlsx");
                  const linhas = produtos.map((p) => ({
                    nome: p.nome,
                    unidade: p.unidade,
                    preco_atual: p.preco_atual,
                    categoria: p.categoria ?? "",
                    nicho: p.nicho ?? "",
                    validade: p.validade ?? "",
                  }));
                  const ws = XLSX.utils.json_to_sheet(linhas);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Produtos");
                  XLSX.writeFile(wb, "modelo_catalogo.xlsx");
                }}
                className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border border-border bg-surface-subtle text-foreground hover:bg-surface transition-colors"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Baixar modelo preenchido
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={onArquivoSelecionado}
                className="block w-full text-sm text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-border file:text-xs file:font-medium file:bg-surface-subtle file:text-foreground hover:file:bg-surface cursor-pointer"
              />
              {carregando && <p className="text-sm text-muted">Processando arquivo...</p>}
            </div>
          )}

          {previa && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">
                {validas.length} produto{validas.length !== 1 ? "s" : ""} na planilha (catálogo será substituído)
                {comErro.length > 0 && (
                  <span className="text-warning ml-1">· {comErro.length} linha{comErro.length !== 1 ? "s" : ""} com erro (ignoradas)</span>
                )}
              </p>

              {validas.length > 0 && (
                <div className="bg-surface border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-surface-subtle">
                        <th className="text-left px-3 py-2 text-muted font-semibold uppercase tracking-wide">Produto</th>
                        <th className="text-left px-3 py-2 text-muted font-semibold uppercase tracking-wide">Unidade</th>
                        <th className="text-left px-3 py-2 text-muted font-semibold uppercase tracking-wide">Preço</th>
                        <th className="text-left px-3 py-2 text-muted font-semibold uppercase tracking-wide">Categoria</th>
                        <th className="text-left px-3 py-2 text-muted font-semibold uppercase tracking-wide">Nicho</th>
                        <th className="text-left px-3 py-2 text-muted font-semibold uppercase tracking-wide">Validade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validas.map((l, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 font-medium text-foreground">{l.nome}</td>
                          <td className="px-3 py-2 text-muted">{l.unidade}</td>
                          <td className="px-3 py-2 text-foreground">{formatMoeda(l.preco_atual!)}</td>
                          <td className="px-3 py-2 text-muted">{l.categoria ?? "—"}</td>
                          <td className="px-3 py-2 text-muted">{l.nicho ?? "—"}</td>
                          <td className="px-3 py-2 text-muted">{l.validade ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {comErro.length > 0 && (
                <div className="bg-danger-bg border border-[var(--danger-border,theme(colors.red.200))] rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-danger uppercase tracking-wide">Linhas com erro</p>
                  {comErro.map((l, i) => (
                    <p key={i} className="text-xs text-danger">
                      <span className="font-medium">{l.nome}</span>: {l.erro}
                    </p>
                  ))}
                </div>
              )}

              <button
                onClick={() => { setPrevia(null); if (inputRef.current) inputRef.current.value = ""; }}
                className="text-xs text-brand hover:underline"
              >
                Selecionar outro arquivo
              </button>
            </div>
          )}
        </div>

        {erroImport && (
          <div className="px-5 py-2 border-t border-border bg-danger-bg">
            <p className="text-xs text-danger">{erroImport}</p>
          </div>
        )}
        <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={fechar}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!previa || validas.length === 0 || pending}
            onClick={confirmar}
          >
            {pending ? "Importando..." : `Confirmar importação${validas.length > 0 ? ` (${validas.length})` : ""}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
