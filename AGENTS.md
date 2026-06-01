<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

### Project overview

Araujo Hub is a CRM/automation platform for Brazilian small retail businesses. Single Next.js 16.2.4 app (App Router + Turbopack) with Supabase backend.

### Running services

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Next.js dev server on port 3000 |
| `pnpm lint` | ESLint (pre-existing warnings expected) |
| `pnpm build` | Production build (TypeScript check) |

### Environment variables

A `.env.local` file is required with at minimum:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Without valid Supabase credentials, the server starts and public routes (`/`, `/login`, `/redefinir-senha`, `/api/*`) work, but authenticated CRM routes redirect to `/login` and `/api/health` returns 503.

### Key caveats

- Use `pnpm` exclusively (user rules). The repo has a legacy `package-lock.json` but pnpm is the active package manager.
- No Docker or devcontainer setup exists. External services (Supabase, N8n, WhatsApp API) are all cloud-hosted.
- Build scripts `sharp` and `unrs-resolver` have ignored build scripts (harmless warning from pnpm). Do not run `pnpm approve-builds` interactively.
- The ESLint config uses the new flat config format (`eslint.config.mjs`). Run lint via `pnpm lint`.
- Supabase migrations live in `supabase/migrations/` but there is no `supabase/config.toml` — they are meant to be applied to a hosted Supabase project.
