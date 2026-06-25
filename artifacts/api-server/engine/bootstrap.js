/**
 * bootstrap.js — set stable, persistent storage paths for the ported Orgni engine
 * before any engine module (lowdb adapter, winston logger, upload dir) loads.
 *
 * At runtime this file is bundled into dist/index.mjs, so __dirname resolves to
 * the dist directory. We anchor storage one level up (artifacts/api-server/storage)
 * so it survives rebuilds (which wipe dist).
 */

const path = require('path');

const base = process.env.ORGNI_STORAGE_DIR || path.join(__dirname, '..', 'storage');

process.env.DB_PATH = process.env.DB_PATH || path.join(base, 'db.json');
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(base, 'uploads');
process.env.LOG_DIR = process.env.LOG_DIR || path.join(base, 'logs');

module.exports = {};
