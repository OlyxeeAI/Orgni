const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const C = 'documents';

async function create(data) {
  const record = {
    id: uuidv4(),
    orgId: data.orgId,
    filename: data.filename,
    originalName: data.originalName,
    fileType: data.fileType,
    filePath: data.filePath,
    fileSize: data.fileSize,
    content: data.content || '',
    wordCount: data.wordCount || 0,
    status: 'pending',
    parseError: null,
    uploadedAt: new Date().toISOString(),
    parsedAt: null
  };
  return db.insert(C, record);
}

async function findById(id)       { return db.findById(C, id); }
async function findByOrg(orgId)   { return db.findMany(C, { orgId }); }
async function update(id, data)   { return db.update(C, id, data); }
async function remove(id)         { return db.delete(C, id); }

module.exports = { create, findById, findByOrg, update, remove };
