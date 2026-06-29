# Orgni

Orgni learns a business's processes, rules, roles, documents, and exceptions so AI can support real business work. Marketing site with a waitlist, plus an operating-model app for managing knowledge sources.

## Run & Operate

Apps run via Replit **workflows**, not a root-level `pnpm dev`. Each artifact has its own workflow.

- `pnpm install` — install all workspace dependencies
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (provisioned). Optional: `AI_API_KEY` / `ANTHROPIC_API_KEY` for the engine's AI features.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (`artifacts/api-server`), esbuild bundle that embeds a CommonJS "engine"
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Frontends: React + Vite

## Where things live

- `artifacts/orgni/` — marketing site (TS, wouter, shadcn) served at `/`
- `artifacts/orgni-app/` — operating-model app (plain JSX) served at `/app/`
- `artifacts/api-server/` — Express API (`/api`), waitlist + document engine; embeds CommonJS engine in `engine/`, file storage in `storage/`
- `lib/api-spec/openapi.yaml` — API contract (source of truth): health + waitlist
- `lib/db/src/schema/` — Drizzle schema (waitlist table)
- `lib/api-client-react/`, `lib/api-zod/` — generated clients (do not hand-edit)
- `attached_assets/` — shared images/assets referenced via `@assets`

## Architecture decisions

- Migrated from a Vercel deployment back to the native Replit `pnpm_workspace` stack; Vercel-only files (`vercel.json`, `api/[[...path]].js`, `build-vercel.mjs`) intentionally excluded.
- The api-server is ESM but embeds a CommonJS document "engine"; esbuild externalizes `pdf-parse`, `mammoth`, `lowdb`, `winston`. See `.agents/memory/cjs-engine-in-esm-apiserver.md`.
- Frontends call the API via root-relative `fetch('/api/...')`; the proxy routes `/api` to the api-server.

## Product

- Marketing landing page with waitlist signup and live count.
- Operating-model app: upload/connect knowledge sources, browse knowledge, an assistant, and plugins.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run apps via workflows, never root `pnpm dev`.
- Re-run codegen after any `lib/api-spec/openapi.yaml` change.
- See `.agents/memory/` for migration-specific notes (CSS namespace, trailing-slash routing, AI service).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
