/**
 * bootstrap.js — set stable, persistent storage paths for the ported Orgni engine
 * before any engine module (lowdb adapter, winston logger, upload dir) loads.
 *
 * At runtime this file is bundled into dist/index.mjs, so __dirname resolves to
 * the dist directory. We anchor storage one level up (artifacts/api-server/storage)
 * so it survives rebuilds (which wipe dist).
 */

const path = require('path');
const os = require('os');

// On serverless (Vercel) the deployment filesystem is read-only; only the OS
// temp dir is writable. For the MVP no-database setup we keep lowdb's JSON file
// there (ephemeral). Locally we anchor in artifacts/api-server/storage so data
// survives rebuilds. Override either with ORGNI_STORAGE_DIR.
const base =
  process.env.ORGNI_STORAGE_DIR ||
  (process.env.VERCEL
    ? path.join(os.tmpdir(), 'orgni-storage')
    : path.join(__dirname, '..', 'storage'));

process.env.DB_PATH = process.env.DB_PATH || path.join(base, 'db.json');
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(base, 'uploads');
process.env.LOG_DIR = process.env.LOG_DIR || path.join(base, 'logs');

module.exports = {};
