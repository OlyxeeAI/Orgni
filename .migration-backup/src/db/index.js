/**
 * src/db/index.js
 *
 * THIS IS THE ONLY FILE YOU CHANGE TO SWAP DATABASES.
 *
 * Current: lowdb (JSON file, zero setup, prototype)
 * Next:    PostgresAdapter or SupabaseAdapter
 *
 * Example production switch:
 *   const PostgresAdapter = require('./adapters/postgres.adapter');
 *   module.exports = new PostgresAdapter();
 */

const LowdbAdapter = require('./adapters/lowdb.adapter');
module.exports = new LowdbAdapter();
