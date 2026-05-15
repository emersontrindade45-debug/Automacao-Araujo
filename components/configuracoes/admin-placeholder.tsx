interface AdminPlaceholderProps {
  titulo: string;
  descricao: string;
}

export function AdminPlaceholder({ titulo, descricao }: AdminPlaceholderProps) {
  return (
    <div className="bg-surface border border-border rounded-xl p-6 space-y-2 max-w-2xl">
      <h2 className="text-base font-semibold text-foreground">{titulo}</h2>
      <p className="text-sm text-muted">{descricao}</p>
      <p className="text-xs text-subtle pt-2 border-t border-border mt-4">
        Funcionalidade prevista no roadmap do Hub — por enquanto use processos manuais ou documentação em{" "}
        <code className="text-foreground">docs/</code>.
      </p>
    </div>
  );
}
