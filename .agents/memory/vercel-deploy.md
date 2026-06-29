---
name: Vercel deploy shape
description: How this monorepo is configured to deploy on Vercel and why the API is excluded.
---

# Vercel deploy

Vercel deploys **static frontends only**: `orgni` (landing) at `/` and `orgni-app` (app) at `/app/`. Config lives in `vercel.json` (custom `buildCommand` + `outputDirectory: public` + SPA rewrites) and `vercel-build.mjs` (assembles a combined `public/`). The generated `public/` is gitignored.

**Why a custom build command:** both Vite apps default to `base: "/"` in a production build (BASE_PATH is only enforced in `serve`/dev). So the app MUST be built with `BASE_PATH=/app/` or its `/assets/...` and image URLs collide with the landing site when merged into one output dir.

**Why the API is excluded:** `artifacts/api-server` is an always-on Express server (`app.listen`) using local-file storage (lowdb v1) and disk-based multer uploads — incompatible with Vercel's serverless, ephemeral-FS model. On Vercel, `/api/*` falls through to SPA HTML (200, not JSON), so backend-dependent app features stay degraded. Full-stack runs cleanly on Replit deploy (persistent server + storage) instead.

**Rewrite ordering matters:** `/app` → `/app/index.html`, then `/app/:path*` → `/app/index.html`, then catch-all `/:path*` → `/index.html`. Real static files are served before rewrites, so assets aren't clobbered.
