# Project Context

SvelteKit frontend for the **mphotos** photo service — an experimental migration of the
Next.js frontend (`../mphotos-ui`) to Svelte, to reach feature parity while learning
Svelte 5 / SvelteKit. Static SPA (client-rendered), talks to the Go backend
(`../mphotos`) over `/api` (session-cookie auth), served behind nginx in production.

# Commands

- Gate (run before committing): `pnpm check` # svelte-check + lint + test + build
- Dev server: `pnpm dev` (frontend on :3000). Reach it through nginx at **:8060**, which
  routes `/` here and `/api` to the Go backend on :8050 (mirrors mphotos-ui — no Vite /api
  proxy). Hitting :3000 directly makes `/api` calls fail; the store then falls back to defaults.
- Build / preview: `pnpm build` · `pnpm preview`
- Type/component check: `pnpm check:svelte` · Lint: `pnpm lint` · Format: `pnpm format`
- Test: `pnpm test` (Vitest, jsdom) · watch: `pnpm test:watch`

# Conventions

- **Svelte 5 runes** (`$state`, `$derived`, `$effect`) for reactivity (runes mode is forced
  on in `vite.config.ts`); stores/context for cross-page state (ports the 4 React contexts:
  MP/auth, Photo, Theme, Toast).
- **API layer** lives in `src/lib/api/` — ported from mphotos-ui: `config.ts` (endpoint map,
  all under `/api`), `client.ts` (fetch wrapper, `{ data }` / `{ error }` envelope),
  per-domain modules under `services/`. Import via the `$lib` alias.
- **Auth** is server-side session cookies (owner + guest); requests are same-origin, so no
  tokens/headers client-side. Keep data fetching client-side (SPA) — no server `load`.
- **Rendering**: static SPA — `ssr = false` / `prerender = false` in `src/routes/+layout.ts`,
  `adapter-static` with `fallback: 'index.html'`.
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite`). Icons: a Heroicons-for-Svelte package.
- Routes in `src/routes/`; feature components under `src/lib/components/`.
- Tests under `src/**/*.{test,spec}.ts` (Vitest + jsdom).

# Behavior Rules

- Ask before assuming when requirements are ambiguous
- Write minimum code to solve the stated problem — no preemptive abstraction
- Only modify files and functions directly involved in the current task
- Say "I'm not sure" when uncertain rather than confabulating
