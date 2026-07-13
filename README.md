# mphotos-svelte

A SvelteKit frontend for the **mphotos** photo service — an experimental migration of the
Next.js frontend ([`mphotos-ui`](https://github.com/msvens/mphotos-ui)) to Svelte 5 /
SvelteKit.

It is a **static SPA** (client-rendered) that talks to the Go `mphotos` backend over `/api`
(session-cookie auth) and is served behind nginx in production.

## Prerequisites

- Node 24 (see `.nvmrc`) and [pnpm](https://pnpm.io)
- The `mphotos` Go backend running locally on `http://localhost:8050`
- An nginx reverse proxy on `http://localhost:8060` routing `/` → the frontend
  dev server (`:3000`) and `/api` → the Go backend (`:8050`) — the same setup
  `mphotos-ui` uses.

## Development

```bash
pnpm install
pnpm dev            # frontend dev server on :3000
```

Open **http://localhost:8060** (through nginx). Opening `:3000` directly works for the
UI, but its `/api` calls will fail (no app-level proxy — nginx handles `/api`).

## Scripts

| Command             | Description                                              |
| ------------------- | -------------------------------------------------------- |
| `pnpm dev`          | Frontend dev server on `:3000` (reach via nginx `:8060`) |
| `pnpm build`        | Production build (static SPA → `build/`)                 |
| `pnpm preview`      | Preview the production build                             |
| `pnpm check`        | CI gate: svelte-check + lint + test + build              |
| `pnpm check:svelte` | Type/component check (`svelte-check`)                    |
| `pnpm lint`         | Prettier check + ESLint                                  |
| `pnpm format`       | Format with Prettier                                     |
| `pnpm test`         | Unit tests (Vitest + jsdom)                              |

## Tech stack

SvelteKit · Svelte 5 (runes) · TypeScript · Tailwind CSS v4 · Vitest · ESLint · Prettier ·
`@sveltejs/adapter-static`.
