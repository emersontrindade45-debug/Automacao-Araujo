import { login, solicitarRedefinicaoSenha } from "./actions";

interface Props {
  searchParams: Promise<{ error?: string; recuperacao?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { error, recuperacao } = await searchParams;

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-[var(--color-brand)]">Araujo Hub</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Acesse o painel de atendimento</p>
      </div>

      <form action={login} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
          />
        </div>

        {error && (
          <p className="text-sm text-[var(--color-danger)] bg-red-50 rounded-lg px-3 py-2">
            E-mail ou senha incorretos. Tente novamente.
          </p>
        )}

        {recuperacao === "enviado" && (
          <p className="text-sm text-[var(--color-success)] bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100">
            Se esse e-mail estiver cadastrado, você receberá um link para redefinir a senha em instantes.
          </p>
        )}
        {recuperacao === "invalido" && (
          <p className="text-sm text-[var(--color-danger)] bg-red-50 rounded-lg px-3 py-2">
            Informe um e-mail válido no formulário abaixo.
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          Entrar
        </button>
      </form>

      <details className="mt-6 text-left border border-[var(--color-border)] rounded-lg bg-white/80">
        <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-[var(--color-muted)] hover:text-foreground">
          Esqueci minha senha
        </summary>
        <div className="px-3 pb-3 pt-1 border-t border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-muted)] mb-3">
            Enviaremos um link seguro para o e-mail cadastrado.
          </p>
          <form action={solicitarRedefinicaoSenha} className="space-y-3">
            <div>
              <label htmlFor="email_recuperacao" className="block text-sm font-medium mb-1">
                E-mail da conta
              </label>
              <input
                id="email_recuperacao"
                name="email_recuperacao"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-foreground hover:bg-[var(--color-border)]/30 transition-colors"
            >
              Enviar link de redefinição
            </button>
          </form>
        </div>
      </details>
    </div>
  );
}
