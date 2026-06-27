---
name: Vercel deploys marketing site only
description: Why the Vercel deploy serves only the orgni marketing site, not the full stack
---

The repo deploys to Vercel (GitHub OlyxeeAI/Orgni → Vercel) via root `vercel.json`:
`outputDirectory: artifacts/orgni/dist/public`, `buildCommand: pnpm run build`, framework null,
plus an SPA fallback rewrite (orgni is a wouter SPA: /, /pricing, /docs, /api-reference).

**Only the marketing site (orgni) goes live on Vercel.** The product app (orgni-app) and the
Express API are intentionally NOT served there.

**Why:** the api-server persists with lowdb (`storage/db.json`) and writes uploads to the local
filesystem. Vercel serverless has an ephemeral/read-only FS, so the backend cannot keep data or
accept uploads there. User explicitly chose "marketing site only" over migrating to a hosted
DB + cloud storage. The full stack (marketing + app + working backend) runs fine on Replit.

**How to apply:** if asked to "make the app/login/documents work on the live (Vercel) site",
that requires migrating the backend off file storage (hosted Postgres + object storage) first —
it is not a config tweak. Vite configs (orgni, orgni-app) only require PORT/BASE_PATH during
`command === "serve"`; at build time base falls back to "/".
