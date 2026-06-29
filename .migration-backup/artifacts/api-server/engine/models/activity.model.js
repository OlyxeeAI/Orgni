const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const C = 'activity';

async function log(orgId, type, description, meta = {}) {
  const entry = {
    id: uuidv4(),
    orgId,
    type,
    description,
    meta,
    createdAt: new Date().toISOString()
  };
  return db.insert(C, entry);
}

async function findByOrg(orgId, limit = 20) {
  return db.findMany(C, { orgId }, { sortBy: 'createdAt', sortDir: 'desc', limit });
}

module.exports = { log, findByOrg };
