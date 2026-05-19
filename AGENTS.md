<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

### Services

| Service | How to run | Notes |
|---------|-----------|-------|
| Next.js dev server | `npm run dev` (port 3000) | The only required local service |
| Supabase | Cloud-hosted (no local instance) | Requires env vars in `.env.local` |
| N8n / WhatsApp / OpenAI / Resend | External APIs | Optional; app degrades gracefully without them |

### Running the app

- `npm run dev` starts the Next.js 16 dev server with Turbopack on port 3000.
- A `.env.local` file is required with at minimum `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Without real Supabase credentials, the landing page (`/`) and login page (`/login`) render fine, but authenticated routes will redirect to `/login`.
- The `package-lock.json` lockfile is the source of truth for dependency versions; use `npm install` for reproducible installs.

### Key commands

- **Lint**: `npx eslint .`
- **Type-check**: `npx tsc --noEmit`
- **Dev server**: `npm run dev`
- **Build**: `npm run build` (requires valid Supabase env vars for server components)

### Gotchas

- There is no root `middleware.ts` — Supabase auth middleware lives in `lib/supabase/middleware.ts` and is not automatically applied. Auth checks happen at the route level.
- The landing page form uses a server action (`submitLead`) that currently only logs to console — no database write yet.
- ESLint reports pre-existing warnings/errors in the codebase (unused vars, React hooks lint). These are not blockers for development.
- No automated test suite exists yet (no `jest`, `vitest`, or `playwright` config).
