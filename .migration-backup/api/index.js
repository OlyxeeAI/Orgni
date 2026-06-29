// Vercel serverless entry for bare `/api` (the catch-all [...path].js handles
// /api/<sub>). Delegates to the same self-contained Express app bundle.
const mod = require("../artifacts/api-server/dist/vercel.cjs");

module.exports = mod.default || mod;
