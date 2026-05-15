"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navAll = [{ href: "/configuracoes/conta", label: "Conta e segurança" }] as const;

const navAdmin = [
  { href: "/configuracoes/follow-up", label: "Follow-up automático" },
  { href: "/configuracoes/usuarios", label: "Usuários e papéis" },
  { href: "/configuracoes/canais", label: "Canais de entrada" },
  { href: "/configuracoes/automacao", label: "Handoff e automação" },
  { href: "/configuracoes/precos", label: "Preços e catálogo" },
  { href: "/configuracoes/sistema", label: "Sistema e saúde" },
] as const;

interface SettingsNavProps {
  isAdmin: boolean;
}

export function SettingsNav({ isAdmin }: SettingsNavProps) {
  const pathname = usePathname();
  const items = isAdmin ? [...navAll, ...navAdmin] : [...navAll];

  return (
    <nav
      className="flex flex-row gap-1 overflow-x-auto pb-1 lg:flex-col lg:w-52 lg:shrink-0 lg:pb-0 lg:overflow-visible"
      aria-label="Seções de configurações"
    >
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors shrink-0",
              active
                ? "bg-brand-50 text-brand-700"
                : "text-muted hover:bg-surface-subtle hover:text-foreground",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
