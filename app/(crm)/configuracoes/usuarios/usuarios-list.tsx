"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UsuarioItem } from "@/lib/supabase/queries/usuarios";
import { alterarPapelAction, removerUsuarioAction } from "./actions";

interface UsuariosListProps {
  usuarios: UsuarioItem[];
  currentUserId: string;
}

const papelLabel: Record<string, string> = {
  admin: "Admin",
  atendimento: "Atendimento",
};

export function UsuariosList({ usuarios, currentUserId }: UsuariosListProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handlePapelChange(userId: string, novoPapel: string) {
    const fd = new FormData();
    fd.set("userId", userId);
    fd.set("papel", novoPapel);
    startTransition(async () => {
      await alterarPapelAction(fd);
      router.refresh();
    });
  }

  function handleRemover(userId: string, nome: string) {
    if (!confirm(`Remover acesso de "${nome}"? Esta ação não pode ser desfeita.`)) return;
    const fd = new FormData();
    fd.set("userId", userId);
    startTransition(async () => {
      try {
        await removerUsuarioAction(fd);
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Erro ao remover usuário");
      }
    });
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">
          Usuários ativos{" "}
          <span className="font-normal text-muted">({usuarios.length})</span>
        </h3>
      </div>

      {usuarios.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted text-center">Nenhum usuário cadastrado.</p>
      ) : (
        <ul className="divide-y divide-border">
          {usuarios.map((u) => {
            const isSelf = u.id === currentUserId;
            return (
              <li key={u.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 font-semibold text-sm select-none">
                  {u.nome.slice(0, 1).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {u.nome}
                    {isSelf && (
                      <span className="ml-1.5 text-xs text-muted font-normal">(você)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted truncate">{u.email}</p>
                </div>

                <select
                  defaultValue={u.papel}
                  disabled={isSelf || pending}
                  onChange={(e) => handlePapelChange(u.id, e.target.value)}
                  className="h-8 rounded-lg border border-border bg-surface px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
                >
                  <option value="atendimento">Atendimento</option>
                  <option value="admin">Admin</option>
                </select>

                {!isSelf && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => handleRemover(u.id, u.nome)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-danger hover:bg-danger-bg transition-colors disabled:opacity-50"
                    title="Remover usuário"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
