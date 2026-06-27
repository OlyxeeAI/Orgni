/**
 * src/db/index.js
 *
 * THIS IS THE ONLY FILE YOU CHANGE TO SWAP DATABASES.
 *
 * Storage is selected at runtime:
 *   - Postgres  → when DATABASE_URL is set (production / Vercel serverless).
 *   - lowdb     → otherwise (zero-setup local prototype, JSON file).
 *
 * Force a specific driver with ORGNI_DB_DRIVER=lowdb | postgres.
 */

const driver =
  process.env.ORGNI_DB_DRIVER ||
  (process.env.DATABASE_URL ? 'postgres' : 'lowdb');

let adapter;
if (driver === 'postgres') {
  const PostgresAdapter = require('./adapters/postgres.adapter');
  adapter = new PostgresAdapter();
} else {
  const LowdbAdapter = require('./adapters/lowdb.adapter');
  adapter = new LowdbAdapter();
}

module.exports = adapter;
