/**
 * database.js
 * File-based JSON database using lowdb.
 * Zero native dependencies — works everywhere Node runs.
 * Replace with PostgreSQL in production by swapping this file only.
 */

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/db.json');

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const adapter = new FileSync(DB_PATH);
const db = low(adapter);

// Schema defaults — all collections
db.defaults({
  organizations: [],
  documents: [],
  businessMaps: [],
  insights: [],
  conversations: [],
  actions: [],
  activity: []
}).write();

module.exports = db;
