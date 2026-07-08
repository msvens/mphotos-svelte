# mphotos-svelte

A SvelteKit frontend for the **mphotos** photo service — an experimental migration of the
Next.js frontend ([`mphotos-ui`](https://github.com/msvens/mphotos-ui)) to Svelte 5 /
SvelteKit.

It is a **static SPA** (client-rendered) that talks to the Go `mphotos` backend over `/api`
(session-cookie auth) and is served behind nginx in production.

## Prerequisites

- Node 24 (see `.nvmrc`) and [pnpm](https://pnpm.io)
- The `mphotos` Go backend running locally on `http://localhost:8050`

## Development

```bash
pnpm install
pnpm dev            # starts Vite; /api is proxied to the backend on :8050
```

Open http://localhost:5173.

## Scripts

| Command             | Description                                    |
| ------------------- | ---------------------------------------------- |
| `pnpm dev`          | Dev server (proxies `/api` → `localhost:8050`) |
| `pnpm build`        | Production build (static SPA → `build/`)       |
| `pnpm preview`      | Preview the production build                   |
| `pnpm check`        | CI gate: svelte-check + lint + test + build    |
| `pnpm check:svelte` | Type/component check (`svelte-check`)          |
| `pnpm lint`         | Prettier check + ESLint                        |
| `pnpm format`       | Format with Prettier                           |
| `pnpm test`         | Unit tests (Vitest + jsdom)                    |

## Tech stack

SvelteKit · Svelte 5 (runes) · TypeScript · Tailwind CSS v4 · Vitest · ESLint · Prettier ·
`@sveltejs/adapter-static`.
