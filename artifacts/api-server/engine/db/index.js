/**
 * src/db/index.js
 *
 * THIS IS THE ONLY FILE YOU CHANGE TO SWAP DATABASES.
 *
 * Local default: lowdb — a zero-setup JSON file store. No database required.
 *
 * Driver selection (first match wins):
 *   1. ORGNI_DB_DRIVER, when set, is always honoured ('lowdb' or 'postgres').
 *   2. On serverless (Vercel) the filesystem is read-only except a temp dir, so
 *      lowdb is EPHEMERAL — data is not shared across instances and is wiped on
 *      cold starts (this is what makes a deployed app "lose" its organizations).
 *      So when running on Vercel AND a DATABASE_URL is present, we default to
 *      Postgres automatically — no second env var needed for persistence.
 *   3. Otherwise (local dev) we keep the zero-setup lowdb default.
 *
 * To force a driver regardless of environment, set ORGNI_DB_DRIVER explicitly.
 */

const explicitDriver = process.env.ORGNI_DB_DRIVER;
const autoPostgres =
  Boolean(process.env.DATABASE_URL) && Boolean(process.env.VERCEL);
const driver = explicitDriver || (autoPostgres ? 'postgres' : 'lowdb');

// Surface the chosen driver in the logs so a misconfigured deployment is obvious.
// Console is used (not the winston logger) to avoid load-order coupling and so it
// always shows up in Vercel's function logs.
if (process.env.VERCEL && driver === 'lowdb') {
  console.warn(
    '[orgni] WARNING: running on Vercel with the lowdb driver — storage is ' +
      'EPHEMERAL (data is lost between requests/cold starts). Set DATABASE_URL ' +
      'on the Vercel project to enable persistent Postgres.',
  );
} else {
  console.log(`[orgni] DB driver: ${driver}`);
}

let adapter;
if (driver === 'postgres') {
  const PostgresAdapter = require('./adapters/postgres.adapter');
  adapter = new PostgresAdapter();
} else {
  const LowdbAdapter = require('./adapters/lowdb.adapter');
  adapter = new LowdbAdapter();
}

module.exports = adapter;
