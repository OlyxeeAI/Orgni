/**
 * src/db/index.js
 *
 * THIS IS THE ONLY FILE YOU CHANGE TO SWAP DATABASES.
 *
 * MVP default: lowdb — a zero-setup JSON file store. No database required.
 *
 * When you outgrow the prototype, opt into Postgres explicitly with
 * ORGNI_DB_DRIVER=postgres (DATABASE_URL must be set). Nothing else changes.
 *
 * Note: on serverless (Vercel) the lowdb file lives in a temp dir and is
 * therefore EPHEMERAL — fine for an MVP/demo, but data is not shared across
 * instances or kept across cold starts. Switch to Postgres for real persistence.
 */

const driver = process.env.ORGNI_DB_DRIVER || 'lowdb';

let adapter;
if (driver === 'postgres') {
  const PostgresAdapter = require('./adapters/postgres.adapter');
  adapter = new PostgresAdapter();
} else {
  const LowdbAdapter = require('./adapters/lowdb.adapter');
  adapter = new LowdbAdapter();
}

module.exports = adapter;
