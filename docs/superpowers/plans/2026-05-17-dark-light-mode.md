# Dark / Light Mode Toggle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um botão de toggle sol/lua no header do hub que alterna entre modo claro e escuro, persistindo a preferência no localStorage e respeitando o sistema operacional na primeira visita.

**Architecture:** Migrar o dark mode de `@media (prefers-color-scheme: dark)` para seletor de classe `.dark {}` no globals.css. Instalar `next-themes` para gerenciar o tema via `class="dark"` no `<html>`. Criar um `ThemeToggle` client component no header.

**Tech Stack:** Next.js App Router, next-themes, Tailwind CSS v4, CSS custom properties

---

## File Map

| Ação | Arquivo | Responsabilidade |
|---|---|---|
| Modificar | `app/globals.css` | Trocar `@media` por `.dark {}` |
| Modificar | `app/layout.tsx` | Adicionar `ThemeProvider` + `suppressHydrationWarning` |
| Criar | `components/providers/theme-provider.tsx` | Re-exportar `NextThemesProvider` como client component |
| Criar | `components/ui/theme-toggle.tsx` | Botão sol/lua com `useTheme()` |
| Modificar | `components/layout/header.tsx` | Inserir `<ThemeToggle />` na área de ações |

---

## Task 1: Instalar next-themes

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Instalar a dependência**

```bash
npm install next-themes
```

- [ ] **Step 2: Verificar que o pacote foi adicionado**

```bash
grep "next-themes" package.json
```

Saída esperada: linha com `"next-themes": "^x.x.x"` em `dependencies`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: instala next-themes"
```

---

## Task 2: Migrar dark mode de @media para .dark

**Files:**
- Modify: `app/globals.css:75-103`

- [ ] **Step 1: Substituir o seletor do dark mode**

Localizar o bloco atual (linhas 75–103):

```css
@media (prefers-color-scheme: dark) {
  :root {
    --surface-base: #09090b;
    ...
  }
}
```

Substituir por:

```css
.dark {
  --surface-base: #09090b;
  --surface-muted: #111113;
  --surface-subtle: #18181b;
  --surface-border: #27272a;

  --fg-base: #fafafa;
  --fg-muted: #a1a1aa;
  --fg-subtle: #71717a;
  --fg-inverted: #09090b;

  --success-bg: #052e16;
  --success-fg: #4ade80;
  --success-border: #166534;

  --warning-bg: #1c1400;
  --warning-fg: #fbbf24;
  --warning-border: #854d0e;

  --danger-bg: #1c0a0a;
  --danger-fg: #f87171;
  --danger-border: #991b1b;

  --info-bg: #0a1628;
  --info-fg: #60a5fa;
  --info-border: #1e3a5f;
}
```

- [ ] **Step 2: Verificar que o servidor compila sem erro**

```bash
npm run dev
```

Saída esperada: `✓ Ready` sem erros de compilação. O hub deve parecer no tema claro (a classe `.dark` ainda não está sendo injetada).

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "style: migra dark mode de @media para seletor .dark"
```

---

## Task 3: Criar ThemeProvider

**Files:**
- Create: `components/providers/theme-provider.tsx`

- [ ] **Step 1: Criar o componente**

Criar `components/providers/theme-provider.tsx` com o conteúdo:

```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props} />;
}
```

- [ ] **Step 2: Verificar que não há erros de TypeScript**

```bash
npx tsc --noEmit
```

Saída esperada: sem erros.

- [ ] **Step 3: Commit**

```bash
git add components/providers/theme-provider.tsx
git commit -m "feat: cria ThemeProvider wrapper para next-themes"
```

---

## Task 4: Adicionar ThemeProvider no layout raiz

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Atualizar layout.tsx**

Substituir o conteúdo completo de `app/layout.tsx` por:

```tsx
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Araujo Hub",
    template: "%s | Araujo Hub",
  },
  description:
    "Automação de atendimento para mercearias, açougues e padarias — CRM integrado com WhatsApp, Instagram e N8n.",
  metadataBase: new URL("https://araujo-hub.vercel.app"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-surface text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verificar que o hub carrega e o tema do sistema é respeitado**

```bash
npm run dev
```

Abrir `http://localhost:3000`. O tema deve corresponder ao modo do sistema operacional. Inspecionar o elemento `<html>` no DevTools — deve ter `class="dark"` (se sistema em dark) ou não ter a classe (se sistema em light).

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: adiciona ThemeProvider no layout raiz"
```

---

## Task 5: Criar componente ThemeToggle

**Files:**
- Create: `components/ui/theme-toggle.tsx`

- [ ] **Step 1: Criar o componente**

Criar `components/ui/theme-toggle.tsx` com o conteúdo:

```tsx
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-8 w-8 rounded-lg" aria-hidden />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted hover:text-foreground hover:bg-surface-subtle transition-colors"
      aria-label={isDark ? "Alternar para modo claro" : "Alternar para modo escuro"}
    >
      {isDark ? (
        /* Ícone sol */
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        /* Ícone lua */
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
```

> **Nota sobre `mounted`:** o `next-themes` não sabe o tema no servidor (SSR). Sem o guard `mounted`, o ícone errado é renderizado no servidor e causa hydration mismatch. O placeholder `div` garante que o espaço seja reservado sem piscar conteúdo incorreto.

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Saída esperada: sem erros.

- [ ] **Step 3: Commit**

```bash
git add components/ui/theme-toggle.tsx
git commit -m "feat: cria ThemeToggle com ícones sol/lua"
```

---

## Task 6: Adicionar ThemeToggle no header

**Files:**
- Modify: `components/layout/header.tsx`

- [ ] **Step 1: Atualizar header.tsx**

Substituir o conteúdo completo de `components/layout/header.tsx` por:

```tsx
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { logout } from "@/app/(public)/login/actions";
import type { Papel } from "@/lib/types";

const papelLabels: Record<Papel, string> = {
  admin: "Admin",
  atendimento: "Atendimento",
};

interface HeaderProps {
  userName?: string;
  userPapel?: Papel;
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
          <span className="text-xs text-muted leading-tight">{papelLabels[userPapel]}</span>
        </div>
        <Avatar name={userName} size="sm" />
        <ThemeToggle />
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
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Saída esperada: sem erros.

- [ ] **Step 3: Commit**

```bash
git add components/layout/header.tsx
git commit -m "feat: adiciona ThemeToggle no header"
```

---

## Task 7: Verificação manual completa

- [ ] **Step 1: Iniciar o servidor de desenvolvimento**

```bash
npm run dev
```

- [ ] **Step 2: Testar cenário — sistema em modo escuro**

1. Configurar o SO para modo escuro
2. Abrir `http://localhost:3000` (login)
3. Fazer login e entrar no hub
4. Verificar: fundo escuro, ícone de **sol** visível no header

- [ ] **Step 3: Testar toggle manualmente**

1. Clicar no ícone de sol → hub deve mudar para modo claro, ícone muda para **lua**
2. Clicar na lua → volta para modo escuro, ícone muda para **sol**

- [ ] **Step 4: Testar persistência**

1. Deixar no modo claro
2. Recarregar a página (`F5`)
3. Verificar: hub abre direto no modo claro (sem flash escuro)

- [ ] **Step 5: Testar em nova aba**

1. Abrir uma nova aba com `http://localhost:3000`
2. Verificar: mesmo tema da aba anterior

- [ ] **Step 6: Verificar ausência de FOUC (flash de conteúdo)**

Recarregar a página com modo escuro ativo. Não deve haver um flash branco antes de o tema ser aplicado.

- [ ] **Step 7: Commit final**

```bash
git add .
git commit -m "feat: dark/light mode toggle completo no hub"
```
