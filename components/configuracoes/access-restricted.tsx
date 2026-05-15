import Link from "next/link";

interface AccessRestrictedProps {
  titulo?: string;
  descricao: string;
}

export function AccessRestricted({
  titulo = "Acesso restrito",
  descricao,
}: AccessRestrictedProps) {
  return (
    <div className="bg-surface border border-border rounded-xl p-6 space-y-4 max-w-lg">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/15 text-warning">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 9v4M12 17h.01M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <div>
        <h2 className="text-base font-semibold text-foreground">{titulo}</h2>
        <p className="text-sm text-muted mt-1">{descricao}</p>
      </div>
      <Link
        href="/kanban"
        className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
      >
        Voltar ao Kanban
      </Link>
    </div>
  );
}
