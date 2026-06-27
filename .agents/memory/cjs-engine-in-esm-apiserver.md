---
name: Bundling a CommonJS sub-app into the ESM api-server
description: How to embed a CommonJS Express engine inside artifacts/api-server (which is type:module + esbuild ESM bundle)
---

# Embedding CommonJS code in the ESM api-server

The `artifacts/api-server` package is `"type": "module"` and is bundled by esbuild
to a single ESM file (`dist/index.mjs`). Dropping a folder of CommonJS `.js` files
under it and importing them will fail with esbuild errors like
`No matching export ... for import "default"` / `import "X" will always be undefined`.

**Rule:** to bundle a self-contained CommonJS sub-tree (e.g. a ported engine under
`artifacts/api-server/engine/`), add a nested `package.json` in that folder with
`{"type":"commonjs"}`. esbuild resolves module format from the *nearest* package.json,
so this makes it treat those files as CJS and the ESM↔CJS interop (`import x from`,
`import { named }`) works. The workspace globs are `artifacts/*` only, so a nested
package.json there is NOT picked up as a workspace package.

**Why:** without it, `type:module` from the parent makes esbuild parse the CJS files
as ESM (no `module.exports` interop), breaking the build.

**How to apply (full recipe for this kind of port):**
- Externalize deps that read sibling files or use dynamic requires in `build.mjs`
  (`pdf-parse`, `pdf-parse/*`, `mammoth`, `lowdb`, `lowdb/*`, `winston`) and add them
  to api-server `dependencies` so they resolve at runtime from node_modules.
- `pdf-parse`'s package entry runs debug code that reads a test PDF; require
  `pdf-parse/lib/pdf-parse.js` instead of `pdf-parse`.
- Engine writes files (lowdb JSON db, uploads, logs). esbuild's banner makes
  `__dirname` = the `dist/` dir at runtime, which is wiped on every rebuild. Use a
  side-effect bootstrap import (evaluated before the engine modules) that sets
  `DB_PATH`/`UPLOAD_DIR`/`LOG_DIR` to a path OUTSIDE dist (e.g.
  `path.join(__dirname,'..','storage')` → `artifacts/api-server/storage`) so data
  survives rebuilds. Side-effect imports run in source order, so place the bootstrap
  import above the engine router import.
- lowdb FileSync is single-process; fine for a no-auth MVP, not for scaled/multi-writer.
