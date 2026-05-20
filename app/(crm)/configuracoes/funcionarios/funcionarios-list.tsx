"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FuncionarioItem } from "@/lib/supabase/queries/funcionarios";
import { toggleAtivoAction, removerFuncionarioAction } from "./actions";

interface FuncionariosListProps {
  funcionarios: FuncionarioItem[];
}

function formatarTelefone(tel: string) {
  if (tel.length === 13)
    return `${tel.slice(0, 2)} ${tel.slice(2, 4)} ${tel.slice(4, 9)}-${tel.slice(9)}`;
  if (tel.length === 11)
    return `${tel.slice(0, 2)} ${tel.slice(2, 7)}-${tel.slice(7)}`;
  return tel;
}

export function FuncionariosList({ funcionarios }: FuncionariosListProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleToggle(id: string, ativo: boolean) {
    startTransition(async () => {
      await toggleAtivoAction(id, ativo);
      router.refresh();
    });
  }

  function handleRemover(id: string, nome: string) {
    if (!confirm(`Remover "${nome}"? Esta ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      await removerFuncionarioAction(id);
      router.refresh();
    });
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">
          Funcionários autorizados{" "}
          <span className="font-normal text-muted">({funcionarios.length})</span>
        </h3>
      </div>

      {funcionarios.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted text-center">
          Nenhum funcionário cadastrado.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {funcionarios.map((f) => (
            <li key={f.id} className="flex items-center gap-4 px-5 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 font-semibold text-sm select-none">
                {f.nome.slice(0, 1).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{f.nome}</p>
                <p className="text-xs text-muted truncate">{formatarTelefone(f.telefone)}</p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={f.ativo}
                  disabled={pending}
                  onChange={(e) => handleToggle(f.id, e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-brand"
                />
                <span className="text-xs text-muted">{f.ativo ? "Ativo" : "Inativo"}</span>
              </label>

              <button
                type="button"
                disabled={pending}
                onClick={() => handleRemover(f.id, f.nome)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-danger hover:bg-danger-bg transition-colors disabled:opacity-50"
                title="Remover funcionário"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4h6v2" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
