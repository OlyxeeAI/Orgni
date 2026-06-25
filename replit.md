# Orgni

Orgni turns business knowledge (documents, processes, rules, roles) into a structured operating model that AI systems can act on safely. This project bundles the marketing landing page and the product dashboard, both served from one shared backend.

## Run & Operate

Apps run via Replit **workflows**, not root-level scripts. The workflows are:

- `artifacts/api-server: API Server` — Express backend (waitlist + Orgni engine) at `/api`
- `artifacts/orgni: web` — marketing landing page at `/`
- `artifacts/orgni-app: web` — product dashboard at `/app`

Useful commands:

- `pnpm --filter @workspace/api-server run build` — build/bundle the API server (esbuild → ESM)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (waitlist)
- Optional env: `AI_API_KEY` / `ANTHROPIC_API_KEY` — enables AI extraction/Q&A; without it the engine still runs deterministic extraction

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (waitlist via Drizzle/Postgres + ported CommonJS "Orgni engine")
- DB: PostgreSQL + Drizzle ORM (waitlist); lowdb JSON file (engine, MVP storage)
- Frontends: Vite + React (landing is TS + wouter + shadcn; product is plain JSX)
- API codegen: Orval (from OpenAPI spec); Build: esbuild (ESM bundle)

## Where things live

- `artifacts/orgni/` — landing page (Vite + React + wouter). CTAs and `home.tsx` in `src/pages/`.
- `artifacts/orgni-app/` — product dashboard (plain JSX: `src/App.jsx`, `src/main.jsx`, `src/styles.css`). Calls the API via root-relative `fetch('/api/...')`.
- `artifacts/api-server/` — backend. Waitlist routes in `src/routes/`; ported document-intelligence engine in `engine/` (CommonJS, see below).
- `lib/db`, `lib/api-spec`, `lib/api-client-react`, `lib/api-zod` — shared DB schema + generated API client/schemas.
- Engine file storage: `artifacts/api-server/storage/` (db.json, uploads/, logs/) — kept outside `dist/` so it survives rebuilds.

## Architecture decisions

- Two frontends + one shared backend. The landing's "Try it" CTA is a plain `<a href="/app">` (cross-artifact navigation), not a wouter Link.
- The product engine is a self-contained CommonJS Express app bundled into the ESM api-server. To make esbuild treat it as CJS, `artifacts/api-server/engine/package.json` declares `"type":"commonjs"`. Heavy deps (`pdf-parse`, `mammoth`, `lowdb`, `winston`) are externalized in `build.mjs`; `engine/bootstrap.js` sets stable storage paths before engine modules load.
- The engine's API is mounted under `/api` after the waitlist router; an engine error handler returns JSON `{ error }`.
- No authentication, by design (MVP). `/api` is open.

## Product

- Landing page: marketing site with waitlist signup and a "Try it" CTA that opens the product.
- Product dashboard: create an organization, upload documents (.txt/.md/.csv/.json/.pdf/.docx), and run "intake" to build a knowledge map (workflows, roles, rules, risks). AI features (Q&A, richer extraction) activate when an AI key is configured.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run apps via workflows, not `pnpm dev` at the workspace root.
- After changing the engine or api-server, the dev workflow rebuilds via esbuild — confirm `pnpm --filter @workspace/api-server run build` succeeds.
- lowdb is single-process/file-based; fine for the MVP, not for scaled/multi-writer use.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `.agents/memory/cjs-engine-in-esm-apiserver.md` for the full recipe on embedding CommonJS code in the ESM api-server
