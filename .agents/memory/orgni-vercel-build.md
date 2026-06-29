---
name: Orgni multi-artifact Vercel build
description: How the Orgni monorepo builds on Vercel as one project, and the gotcha that breaks recursive builds.
---

The Orgni repl deploys to Vercel as ONE project that runs the root `pnpm run build`
(recursive across all workspace artifacts). The landing page (`artifacts/orgni`)
must not be touched; the app lives in `artifacts/orgni-app`; API in
`artifacts/api-server`; a Replit-only canvas tool in `artifacts/mockup-sandbox`.

**Rule:** any artifact's `vite.config.ts` that reads Replit-injected env vars
(PORT, BASE_PATH) must NOT throw when those are missing during `vite build` —
only when serving. Otherwise the Vercel recursive build fails on that package.

**Why:** PORT/BASE_PATH are injected by Replit at dev/serve time only; Vercel's
build has neither, and a hard throw at config-eval time aborts the whole build.

**How to apply:** guard the throws with `const isBuild = process.argv.includes("build")`
and fall back to safe defaults (port 5173, base "/"). Keep `defineConfig({...})`
object-style with a module-level top-level `await import()` for the cartographer
plugin — do NOT convert to `defineConfig(async () => ...)`, because the repo's
`tsc` typecheck rejects the async-function overload (UserConfigFnPromise) in this
vite version even though `vite build` accepts it.
