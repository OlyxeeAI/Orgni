/**
 * insight.model.js
 * Individual extracted facts — each linked to its source document.
 * This is what enables source traceability.
 */
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const C = 'insights';

async function create(data) {
  const record = {
    id: uuidv4(),
    orgId: data.orgId,
    mapId: data.mapId,
    type: data.type,           // workflow | role | rule | risk | gap | opportunity
    content: data.content,     // the extracted fact (JSON or string)
    sourceDocumentId: data.sourceDocumentId || null,
    sourceDocumentName: data.sourceDocumentName || null,
    sourceExcerpt: data.sourceExcerpt || null,  // relevant snippet from source
    confidence: data.confidence || 0,
    createdAt: new Date().toISOString()
  };
  return db.insert(C, record);
}

async function findByOrg(orgId)          { return db.findMany(C, { orgId }); }
async function findByMap(mapId)          { return db.findMany(C, { mapId }); }
async function findByType(orgId, type)   { return db.findMany(C, { orgId, type }); }
async function findById(id)              { return db.findById(C, id); }

module.exports = { create, findByOrg, findByMap, findByType, findById };
