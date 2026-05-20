"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adicionarFuncionarioAction } from "./actions";

export function FuncionariosForm() {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMsg(null);
    startTransition(async () => {
      try {
        await adicionarFuncionarioAction(fd);
        setMsg({ tipo: "ok", texto: "Funcionário cadastrado com sucesso." });
        formRef.current?.reset();
        router.refresh();
      } catch (err) {
        setMsg({
          tipo: "erro",
          texto: err instanceof Error ? err.message : "Erro ao cadastrar",
        });
      }
    });
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Adicionar funcionário</h3>
      <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="nome" className="text-xs font-medium text-muted">
            Nome
          </label>
          <input
            id="nome"
            name="nome"
            type="text"
            required
            placeholder="Ex: João Silva"
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="telefone" className="text-xs font-medium text-muted">
            Telefone (WhatsApp)
          </label>
          <input
            id="telefone"
            name="telefone"
            type="tel"
            required
            placeholder="55 11 99999-9999"
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <div className="flex flex-col justify-end">
          <button
            type="submit"
            disabled={pending}
            className="h-9 rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {pending ? "Adicionando..." : "+ Adicionar"}
          </button>
        </div>

        {msg && (
          <p className={`sm:col-span-3 text-xs ${msg.tipo === "ok" ? "text-success" : "text-danger"}`}>
            {msg.texto}
          </p>
        )}
      </form>
    </div>
  );
}
