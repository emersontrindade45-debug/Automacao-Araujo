import { Avatar } from "@/components/ui/avatar";
import { logout } from "@/app/(public)/login/actions";

const papelLabels: Record<string, string> = {
  admin: "Admin",
  atendimento: "Atendimento",
  separacao: "Separação",
  expedicao: "Expedição",
  followup: "Follow-up",
};

interface HeaderProps {
  userName?: string;
  userPapel?: string;
}

export function Header({ userName = "Usuário", userPapel = "atendimento" }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between px-5 border-b border-border bg-surface shrink-0">
      <div className="flex items-center gap-2 md:hidden">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white font-bold text-sm">
          A
        </span>
        <span className="font-semibold text-foreground text-sm">Araujo Hub</span>
      </div>

      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-sm font-medium text-foreground leading-tight">{userName}</span>
          <span className="text-xs text-muted leading-tight">{papelLabels[userPapel] ?? userPapel}</span>
        </div>
        <Avatar name={userName} size="sm" />
        <form action={logout}>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium text-muted hover:text-foreground hover:bg-surface-subtle transition-colors"
            aria-label="Sair"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="hidden sm:inline">Sair</span>
          </button>
        </form>
      </div>
    </header>
  );
}
