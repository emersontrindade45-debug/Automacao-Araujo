"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface SidebarProps {
  precosPendentes?: number;
}

export function Sidebar({ precosPendentes = 0 }: SidebarProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      href: "/kanban",
      label: "Kanban",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <rect x="3" y="3" width="5" height="18" rx="1" />
          <rect x="10" y="3" width="5" height="12" rx="1" />
          <rect x="17" y="3" width="4" height="15" rx="1" />
        </svg>
      ),
    },
    {
      href: "/clientes",
      label: "Clientes",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <circle cx="9" cy="7" r="4" />
          <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
          <path d="M16 3.13a4 4 0 010 7.75" />
          <path d="M21 21v-2a4 4 0 00-3-3.87" />
        </svg>
      ),
    },
    {
      href: "/pedidos",
      label: "Pedidos",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 01-8 0" />
        </svg>
      ),
    },
    {
      href: "/precos",
      label: "Preços",
      badge: precosPendentes || undefined,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 h-screen sticky top-0 bg-surface border-r border-border">
      {/* Logo */}
      <div className="flex items-center gap-2.5 h-14 px-5 border-b border-border shrink-0">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white font-bold text-sm">
          A
        </span>
        <span className="font-semibold text-foreground text-sm">Araujo Hub</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-muted hover:bg-surface-subtle hover:text-foreground",
              ].join(" ")}
            >
              <span className={active ? "text-brand" : ""}>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge != null && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-warning text-white text-[10px] font-bold px-1">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 text-xs text-subtle text-center">
        v0.1 · Araujo Hub
      </div>
    </aside>
  );
}
