"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { convidarUsuarioAction } from "./actions";
import { Button } from "@/components/ui/button";

export function ConvidarForm() {
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
        await convidarUsuarioAction(fd);
        setMsg({ tipo: "ok", texto: "Convite enviado com sucesso! O usuário receberá um e-mail." });
        formRef.current?.reset();
        router.refresh();
      } catch (err) {
        setMsg({ tipo: "erro", texto: err instanceof Error ? err.message : "Erro ao enviar convite" });
      }
    });
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Convidar novo usuário</h3>

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
            placeholder="Ex: Maria Silva"
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-xs font-medium text-muted">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="colaborador@email.com"
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="papel" className="text-xs font-medium text-muted">
            Papel
          </label>
          <select
            id="papel"
            name="papel"
            defaultValue="atendimento"
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="atendimento">Atendimento</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="sm:col-span-3 flex items-center gap-3">
          <Button type="submit" variant="primary" size="sm" disabled={pending}>
            {pending ? "Enviando..." : "Enviar convite"}
          </Button>
          {msg && (
            <p className={`text-xs ${msg.tipo === "ok" ? "text-success" : "text-danger"}`}>
              {msg.texto}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
