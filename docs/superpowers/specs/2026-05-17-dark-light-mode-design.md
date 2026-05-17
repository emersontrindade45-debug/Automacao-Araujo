# Dark / Light Mode — Design Spec

**Data:** 2026-05-17  
**Escopo:** Hub (shell CRM) — sidebar, header e conteúdo interno  
**Fora do escopo:** Alterar funcionalidades, layouts de conteúdo, landing page

---

## Contexto

O projeto já possui tokens CSS completos para modo escuro (`--surface-base`, `--fg-base`, etc.), porém implementados via `@media (prefers-color-scheme: dark)`. Isso significa que o tema segue apenas a preferência do sistema operacional — não há como o usuário alternar manualmente dentro do app.

O objetivo é adicionar um toggle no header do hub que permita ao usuário escolher entre modo claro e escuro, com a preferência persistida no `localStorage`.

---

## Decisões

| Decisão | Escolha | Motivo |
|---|---|---|
| Local do toggle | Header (canto direito) | Visível em todas as páginas do hub |
| Modo padrão | Seguir sistema (`defaultTheme="system"`) | Respeita a preferência do OS na primeira visita |
| Biblioteca | `next-themes` | Padrão do ecossistema Next.js; trata SSR, hidratação e localStorage automaticamente |
| Mecanismo CSS | `.dark {}` (classe no `<html>`) | Necessário para toggle manual; substitui o `@media` atual |

---

## Arquitetura

### 1. `app/globals.css` — Trocar seletor do dark mode

**Antes:**
```css
@media (prefers-color-scheme: dark) {
  :root {
    --surface-base: #09090b;
    /* ... demais variáveis ... */
  }
}
```

**Depois:**
```css
.dark {
  --surface-base: #09090b;
  /* ... demais variáveis ... */
}
```

Nenhuma variável de valor é alterada — apenas o seletor muda.

### 2. `components/providers/theme-provider.tsx` — Re-exportar ThemeProvider

Componente client fino que re-exporta o `ThemeProvider` do `next-themes`. Necessário porque o `layout.tsx` é server component e não pode importar diretamente hooks de client.

```tsx
"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";
export function ThemeProvider({ children, ...props }) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

### 3. `app/layout.tsx` — Adicionar ThemeProvider

Envolver `{children}` com o `ThemeProvider`:

```tsx
<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
  {children}
</ThemeProvider>
```

Adicionar `suppressHydrationWarning` no `<html>` para evitar warning de hidratação (o next-themes modifica o atributo `class` no servidor vs. cliente).

### 4. `components/ui/theme-toggle.tsx` — Botão de alternância

Client component com lógica:
- Ícone de **sol** quando o tema ativo é `"light"`
- Ícone de **lua** quando o tema ativo é `"dark"` ou `"system"` em dark
- Usa `useTheme()` do next-themes para ler e alterar o tema
- Alterna entre `"light"` e `"dark"` ao clicar; o tema `"system"` só existe como estado inicial — após o primeiro clique do usuário, o controle passa a ser explícito (`"light"` ou `"dark"`)
- Estilo consistente com o botão Sair: `h-8 px-3 rounded-lg text-muted hover:text-foreground hover:bg-surface-subtle`
- `aria-label` descritivo ("Alternar para modo escuro" / "Alternar para modo claro")

### 5. `components/layout/header.tsx` — Inserir toggle

Adicionar `<ThemeToggle />` na área de ações do header, entre o `<Avatar>` e o botão Sair:

```
[ Nome / Papel ]  [ Avatar ]  [ ThemeToggle ]  [ Sair ]
```

O header permanece server component; apenas o `ThemeToggle` é client.

---

## Fluxo de dados

```
localStorage / OS preference
        ↓
  next-themes ThemeProvider
        ↓ (adiciona class="dark" em <html>)
  CSS selector .dark { ... }
        ↓ (altera variáveis CSS)
  Tailwind tokens (bg-surface, text-foreground, etc.)
        ↓
  Todos os componentes do hub
```

---

## Testes manuais esperados

1. Acessar o hub → tema segue o sistema operacional
2. Clicar no toggle → alterna entre claro/escuro imediatamente
3. Recarregar a página → preferência manual persiste
4. Abrir em nova aba → mesma preferência persiste
5. Sem flash de conteúdo (FOUC) no carregamento

---

## Arquivos que serão modificados

| Arquivo | Tipo de mudança |
|---|---|
| `app/globals.css` | `@media` → `.dark {}` |
| `app/layout.tsx` | Adicionar ThemeProvider + suppressHydrationWarning |
| `components/layout/header.tsx` | Adicionar ThemeToggle |

## Arquivos novos

| Arquivo | Descrição |
|---|---|
| `components/providers/theme-provider.tsx` | Re-exporta NextThemesProvider |
| `components/ui/theme-toggle.tsx` | Botão sol/lua client component |

## Dependência nova

| Pacote | Versão |
|---|---|
| `next-themes` | latest |
