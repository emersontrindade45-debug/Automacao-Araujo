"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const primaryLinkClass =
  "inline-flex w-full items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors";

export default function RedefinirSenhaPage() {
  const [sessionOk, setSessionOk] = useState(false);
  const [checked, setChecked] = useState(false);
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      try {
        const search = typeof window !== "undefined" ? window.location.search : "";
        if (search.includes("code=")) {
          const { error } = await supabase.auth.exchangeCodeForSession(search);
          if (!error) {
            window.history.replaceState({}, "", "/redefinir-senha");
          }
        }

        const { data } = await supabase.auth.getSession();
        if (data.session) setSessionOk(true);
      } finally {
        setChecked(true);
      }
    }

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setSessionOk(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  function handleNovaSenha(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    const nova = (fd.get("nova_senha") as string)?.trim() ?? "";
    const confirmar = (fd.get("confirmar_senha") as string)?.trim() ?? "";

    if (nova.length < 8) {
      setErro("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (nova !== confirmar) {
      setErro("A confirmação não coincide.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: nova });
      if (error) {
        setErro(error.message || "Não foi possível salvar.");
        return;
      }
      setOk(true);
    });
  }

  if (!checked) {
    return (
      <div className="w-full max-w-sm text-center text-sm text-muted py-8">
        Validando link de recuperação…
      </div>
    );
  }

  if (!sessionOk && !ok) {
    return (
      <div className="w-full max-w-sm space-y-4 text-center">
        <p className="text-sm text-muted">
          Link inválido ou expirado. Solicite um novo e-mail na tela de login.
        </p>
        <Link href="/login" className="inline-block text-sm font-medium text-brand hover:text-brand-600">
          Voltar ao login
        </Link>
      </div>
    );
  }

  if (ok) {
    return (
      <div className="w-full max-w-sm space-y-4 text-center">
        <p className="text-sm text-success font-medium">Senha atualizada. Você já pode entrar.</p>
        <Link href="/login" className={primaryLinkClass}>
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold text-brand">Nova senha</h1>
        <p className="mt-1 text-sm text-muted">Defina uma nova senha para sua conta.</p>
      </div>
      <form onSubmit={handleNovaSenha} className="space-y-4">
        <Input name="nova_senha" type="password" label="Nova senha" required minLength={8} autoComplete="new-password" />
        <Input
          name="confirmar_senha"
          type="password"
          label="Confirmar senha"
          required
          minLength={8}
          autoComplete="new-password"
        />
        {erro && <p className="text-sm text-danger">{erro}</p>}
        <Button type="submit" variant="primary" className="w-full" disabled={pending}>
          {pending ? "Salvando…" : "Salvar nova senha"}
        </Button>
      </form>
    </div>
  );
}
