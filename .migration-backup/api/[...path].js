// Vercel serverless entry for /api/* — delegates every request to the bundled
// Express app (self-contained CJS bundle, no app.listen). Vercel forwards the
// full URL and the app is mounted at /api, so paths line up with no stripping.
const mod = require("../artifacts/api-server/dist/vercel.cjs");

module.exports = mod.default || mod;
