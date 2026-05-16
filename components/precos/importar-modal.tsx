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
  estoque_atual: number | null;
  erro: string | null;
}

function parseNumero(v: unknown): number | null {
  const n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) || n < 0 ? null : n;
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
    if (!nome) return { nome: "(vazio)", unidade: null, preco_atual: null, estoque_atual: null, erro: "Nome obrigatório" };

    const unidade = String(row["unidade"] ?? row["Unidade"] ?? "").trim() || null;
    if (!unidade) return { nome, unidade: null, preco_atual: null, estoque_atual: null, erro: "Unidade obrigatória (ex: kg, unidade, pacote)" };

    const preco_atual = parseNumero(row["preco_atual"] ?? row["Preço Atual"] ?? row["preco"] ?? row["Preco"]);
    const estoque_atual = parseNumero(row["estoque_atual"] ?? row["Estoque Atual"] ?? row["estoque"] ?? row["Estoque"]);

    if (preco_atual === null) return { nome, unidade, preco_atual: null, estoque_atual: null, erro: "preco_atual inválido (deve ser número >= 0)" };
    if (estoque_atual === null) return { nome, unidade, preco_atual, estoque_atual: null, erro: "estoque_atual inválido (deve ser número >= 0)" };

    return { nome, unidade, preco_atual, estoque_atual, erro: null };
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
      estoque_atual: l.estoque_atual!,
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
                <code className="px-1.5 py-0.5 bg-surface-subtle rounded text-xs">estoque_atual</code>.
                {" "}Produtos novos serão criados; existentes serão atualizados.
              </p>
              <button
                type="button"
                onClick={async () => {
                  const XLSX = await import("xlsx");
                  const linhas = produtos.map((p) => ({
                    nome: p.nome,
                    unidade: p.unidade,
                    preco_atual: p.preco_atual,
                    estoque_atual: p.estoque_atual,
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
                {validas.length} produto{validas.length !== 1 ? "s" : ""} serão atualizados
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
                        <th className="text-left px-3 py-2 text-muted font-semibold uppercase tracking-wide">Estoque</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validas.map((l, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 font-medium text-foreground">{l.nome}</td>
                          <td className="px-3 py-2 text-muted">{l.unidade}</td>
                          <td className="px-3 py-2 text-foreground">{formatMoeda(l.preco_atual!)}</td>
                          <td className="px-3 py-2 text-foreground">{l.estoque_atual}</td>
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
