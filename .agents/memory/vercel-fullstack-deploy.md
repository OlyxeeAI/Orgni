---
name: Vercel single-project full-stack deploy
description: How the Orgni monorepo (marketing + app SPA + Express engine) deploys as ONE Vercel project.
---

# Orgni on Vercel (one project)

**Deploy target:** the user deploys this repo on Vercel (GitHub → Vercel), not on
Replit. Keep the Vercel path working.

Everything is served from a single Vercel project:
- `/`        → orgni marketing SPA (built with base `/`)
- `/app/`    → orgni-app dashboard SPA (built with `BASE_PATH=/app/`)
- `/api/*`   → Express "engine" backend as ONE serverless function

**Why this shape:** both SPAs fetch root-relative `/api/...`, so everything must
live under one origin. The app SPA is served under `/app/` but its API calls use
absolute `/api/...` (not base-relative), which correctly hit the function.

## The moving parts (all at repo root)
- `vercel.json`: `buildCommand` builds orgni (base `/`), orgni-app
  (`BASE_PATH=/app/`), then api-server, then `node ./vercel-build.mjs`.
  `outputDirectory` = `public`. `functions` sets `api/*.js` maxDuration 60.
  `rewrites`: `/app`, `/app/:path*` → their index.html, then SPA catch-all
  `/((?!api/).*)` → `/index.html` (excludes `/api`; functions resolve before
  rewrites anyway).
- `vercel-build.mjs`: copies `artifacts/orgni/dist/public` → `public/` and
  `artifacts/orgni-app/dist/public` → `public/app/`. `public/` is gitignored.
- `api/[...path].js` + `api/index.js`: tiny CJS shims, both
  `module.exports = require("../artifacts/api-server/dist/vercel.cjs").default`.
  Vercel forwards the full URL; the app is mounted at `/api`, so no path stripping.

## The two api-server bundles (artifacts/api-server/build.mjs)
One `build.mjs` emits BOTH, from different entries:
- `dist/index.mjs` — ESM, entry `src/index.ts` (calls `app.listen`). Used by the
  Replit dev workflow / any always-on host. Externalizes many pure-JS deps
  (lowdb/winston/mammoth/pdf-parse) because they don't bundle cleanly into ESM.
- `dist/vercel.cjs` — **CJS, self-contained**, entry `src/app.ts` (exports the
  app, NO listen). Externalize ONLY `*.node`, `pg-native`, `pg-cloudflare`,
  `pino-pretty`. CJS handles the engine's dynamic requires, so EVERYTHING else is
  bundled in and the function does NOT depend on node_modules tracing at runtime.
  **Why CJS self-contained:** an ESM bundle with externals forces Vercel to trace
  mammoth/pdf-parse/winston from node_modules (fragile); bundling them in CJS is
  robust. Bundle is ~15MB (well under Vercel's 250MB unzipped limit).

## Serverless-safety facts (already true in the engine code)
- Uploads: multer `memoryStorage()` (no disk); parsing is buffer-based and AWAITED
  in the controller (serverless may freeze right after responding).
- winston logger (`engine/db/logger.js`): Console only; file transports opt-in via
  `ORGNI_LOG_TO_FILE=true` — keep unset on Vercel.
- pino (`src/lib/logger.ts`): pretty transport only when `NODE_ENV!=production`, so
  prod needs no worker-thread transport files. (A local require WITHOUT
  NODE_ENV=production WILL crash trying to load a thread-stream worker — test the
  bundle with `NODE_ENV=production`.)
- Storage driver (`engine/db/index.js`): defaults to lowdb; Postgres is OPT-IN via
  `ORGNI_DB_DRIVER=postgres` (does NOT auto-switch on `DATABASE_URL`). On Vercel
  lowdb writes to `os.tmpdir()` (bootstrap.js anchors there when `process.env.VERCEL`
  is set) — EPHEMERAL per-instance. Use Postgres for real persistence.
- `postgres.adapter.js` auto-creates per-collection tables (`CREATE TABLE IF NOT
  EXISTS`, race-safe). PG pool tuned low for serverless fan-out.

## Required Vercel env for a fully-working app
- `ORGNI_DB_DRIVER=postgres` + `DATABASE_URL` (with provider SSL) → real persistence.
- AI key: `AI_API_KEY` (aliases: `XAI_API_KEY`/`GROK_API_KEY`/`ANTHROPIC_API_KEY`);
  optional `AI_PROVIDER` (default `grok`), `AI_MODEL`. Without a key the app still
  works: chat/ask fall back to the deterministic extractor; only the opt-in LLM
  intake path (`ORGNI_USE_LLM_EXTRACTION`) fails loudly by design.
- `NODE_ENV=production` is set by Vercel automatically.
