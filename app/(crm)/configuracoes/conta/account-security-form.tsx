"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { atualizarSenhaLogadoAction } from "./actions";

interface AccountSecurityFormProps {
  email: string;
  nomeExibicao: string;
}

export function AccountSecurityForm({ email, nomeExibicao }: AccountSecurityFormProps) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function handleSenha(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setOk(false);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await atualizarSenhaLogadoAction(fd);
        setOk(true);
        e.currentTarget.reset();
        setTimeout(() => setOk(false), 4000);
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Erro ao atualizar senha");
      }
    });
  }

  return (
    <div className="space-y-8 max-w-lg">
      <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Seu perfil</h2>
        <div className="space-y-1 text-sm">
          <p>
            <span className="text-muted">Nome: </span>
            <span className="text-foreground font-medium">{nomeExibicao}</span>
          </p>
          <p>
            <span className="text-muted">E-mail: </span>
            <span className="text-foreground font-medium">{email}</span>
          </p>
        </div>
        <p className="text-xs text-subtle">
          O nível de acesso é <strong className="text-foreground">Admin</strong> ou{" "}
          <strong className="text-foreground">Atendimento</strong>, definido no Supabase Auth (app_metadata.papel).
        </p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Alterar senha</h2>
        <p className="text-sm text-muted">
          Use uma senha forte. Você permanece logado após a troca.
        </p>
        <form onSubmit={handleSenha} className="space-y-4">
          <Input
            name="nova_senha"
            type="password"
            label="Nova senha"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Mínimo 8 caracteres"
          />
          <Input
            name="confirmar_senha"
            type="password"
            label="Confirmar nova senha"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Repita a nova senha"
          />
          {erro && <p className="text-sm text-danger">{erro}</p>}
          {ok && <p className="text-sm text-success font-medium">Senha atualizada com sucesso.</p>}
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Salvando…" : "Atualizar senha"}
          </Button>
        </form>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 space-y-3">
        <h2 className="text-base font-semibold text-foreground">Esqueceu a senha?</h2>
        <p className="text-sm text-muted">
          Se não conseguir entrar, faça logout e use a recuperação por e-mail na tela de login — enviamos um link
          seguro para redefinir.
        </p>
        <Link
          href="/login"
          className="inline-flex text-sm font-medium text-brand hover:text-brand-600 transition-colors"
        >
          Ir para o login →
        </Link>
      </div>
    </div>
  );
}
