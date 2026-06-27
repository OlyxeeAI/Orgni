// Vercel Serverless Function entry for the entire Orgni "engine" backend.
//
// This optional catch-all ([[...path]]) receives every /api/* request and
// hands it to the bundled Express app produced by:
//   pnpm --filter @workspace/api-server run build:vercel
// (output: artifacts/api-server/dist/vercel.cjs, default-exports the app).
//
// The Express app mounts its routes under /api, and Vercel forwards the
// original request URL, so paths line up without any rewriting.

const mod = require("../artifacts/api-server/dist/vercel.cjs");

module.exports = mod.default || mod;
