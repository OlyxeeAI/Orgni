---
name: Vite config env guard
description: Artifact vite.config PORT/BASE_PATH validation must be gated on serve, not build.
---
Each artifact's `vite.config.ts` validates `PORT`/`BASE_PATH` and throws if missing. That throw MUST be gated behind `command === "serve"` (use the function form `defineConfig(async ({ command }) => {...})` with `const isServe = command === "serve"`). Use `base: basePath ?? "/"` so build has a default.

**Why:** The root `pnpm run build` runs `pnpm -r run build` (vite build) with no PORT/BASE_PATH set. A top-level/unguarded throw fails config load and breaks the whole workspace build — even though dev workflows look healthy.

**How to apply:** When migrating/scaffolding, ensure ALL artifact vite configs (including platform-scaffolded mockup-sandbox) use the isServe guard. The orgni/orgni-app configs are the reference pattern.
