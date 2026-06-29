---
name: Vercel single-project full-stack deploy
description: How the Orgni monorepo (marketing + app SPA + Express engine) deploys as ONE Vercel project. User NEVER deploys on Replit.
---

# Orgni on Vercel (one project)

**Hard constraint:** user is adamant — NEVER deploy on Replit. Vercel only.

Layout served from a single Vercel project:
- `/`        → orgni marketing SPA (built with base `/`)
- `/app/`    → orgni-app dashboard SPA (built with `BASE_PATH=/app/`)
- `/api/*`   → Express "engine" backend as ONE serverless function

**Why this shape:** frontends fetch root-relative `/api/...`, so everything must
live under one origin. The app SPA is served under `/app/` but its API calls use
absolute `/api/...` (not base-relative), which correctly hit the function.

## The moving parts
- Root `package.json` `build` builds orgni → orgni-app (BASE_PATH=/app/) →
  api-server `build:vercel`, then `collect:public` copies into `public/` and
  `public/app/`. `vercel.json` outputDirectory is `public`.
- `vercel.json` rewrites: `/app`, `/app/(.*)`, then `/(.*)` → respective
  `index.html`. Rewrites only fire when no file/function matches, so static
  assets and the `/api` function are safe; list `/app` rules BEFORE the catch-all.
- `api/[[...path]].js` (repo root) requires the bundle's default export (Express
  app). Optional catch-all matches `/api` and `/api/*`; Vercel forwards the full
  URL and Express is mounted at `/api`, so paths line up with no stripping.
- `artifacts/api-server/build-vercel.mjs` esbuilds `src/app.ts` → `dist/vercel.cjs`
  (CJS, self-contained). Externalize ONLY `*.node`, `pg-native`, `pg-cloudflare`,
  `pino-pretty`. Entry is app.ts because it default-exports the app with NO
  `.listen()` (index.ts is the one that listens — do not use it as the entry).

## Serverless-safety rules (read-only FS, freeze-after-response)
- Storage (MVP = NO DATABASE): `engine/db/index.js` defaults to lowdb; Postgres
  is OPT-IN only via `ORGNI_DB_DRIVER=postgres` (it does NOT auto-switch on
  `DATABASE_URL`). The user explicitly wants no database for the MVP.
  - lowdb writes a JSON file; on Vercel the FS is read-only except the OS temp
    dir, so `bootstrap.js` anchors storage at `os.tmpdir()/orgni-storage` when
    `process.env.VERCEL` is set (else `artifacts/api-server/storage`). This means
    data on Vercel is EPHEMERAL (per-instance, lost on cold start) — fine for an
    MVP/demo, NOT real persistence. Flip to Postgres later for durability.
  - Postgres path (when opted in) reuses the SAME Replit `DATABASE_URL` as
    lib/db's waitlist. `postgres.adapter.js` auto-creates per-collection tables
    (`id TEXT PK, data JSONB, created_at, updated_at`) via `CREATE TABLE IF NOT
    EXISTS` — race-safe across cold starts.
- Uploads: multer `memoryStorage` (no disk). Parsing is buffer-based
  (`parser.service.parseBuffer`) and AWAITED in the controller — serverless may
  freeze right after responding, so fire-and-forget parsing is unreliable.
- Logger (`engine/db/logger.js`): console-only by default; file transports only
  if `ORGNI_LOG_TO_FILE=true`. Keep it unset on Vercel.
- pino (`src/lib/logger.ts`): pretty transport only when NODE_ENV!=production, so
  the prod JSON path needs no worker files — safe to bundle without the plugin.
- PG pool tuned for serverless fan-out: low `max` (default 3), short idle/connect
  timeouts, `allowExitOnIdle: true`. Override via `PG_POOL_MAX` etc.

**Required Vercel env:** `DATABASE_URL` (and `NODE_ENV=production`, which Vercel
sets automatically). AI assistant is optional (Anthropic integration env vars).

**AI must never break the app without a key.** Default intake extraction is
deterministic (`ORGNI_USE_LLM_EXTRACTION` is off by default) and `ask` uses the
deterministic extractor — neither needs a key. The only default AI runtime path
is `chat`; it checks `ai.isConfigured()` and falls back to the same deterministic
context answerer (and also catches MISSING_API_KEY/AUTH_ERROR at call time), so
chat degrades to grounded retrieval instead of 5xx. Intake's opt-in LLM path
still fails loudly without a key by design (a fake empty knowledge map is worse).
