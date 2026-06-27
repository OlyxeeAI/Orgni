import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import { rm } from "node:fs/promises";

// Plugins / pino may use `require` to resolve dependencies.
globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Builds a SELF-CONTAINED CommonJS bundle of the Express app for use as a
 * Vercel Serverless Function (api/[[...path]].js requires this file).
 *
 * Unlike build.mjs (ESM, for the long-running Replit dev server), this:
 *   - emits CommonJS so it drops straight into Vercel's Node runtime,
 *   - bundles the engine deps (pdf-parse, mammoth, lowdb, winston, pg) so the
 *     function has no reliance on pnpm's symlinked node_modules at runtime,
 *   - externalizes only truly native / optional bindings.
 *
 * The entry is app.ts (default-exports the Express app, no .listen()), so the
 * bundle's default export is the request handler Vercel invokes.
 */
async function buildVercel() {
  const outfile = path.resolve(artifactDir, "dist/vercel.cjs");
  await rm(outfile, { force: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/app.ts")],
    platform: "node",
    target: "node20",
    bundle: true,
    format: "cjs",
    outfile,
    logLevel: "info",
    // Only externalize things that genuinely cannot be bundled. Everything else
    // (pdf-parse, mammoth, lowdb, winston, pg, pino, express) is bundled in.
    external: [
      "*.node",
      "pg-native",
      "pg-cloudflare",
      "pino-pretty",
    ],
    sourcemap: false,
  });
}

buildVercel().catch((err) => {
  console.error(err);
  process.exit(1);
});
