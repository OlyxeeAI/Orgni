/**
 * src/models/chunk.model.js
 *
 * Retrievable pieces of a parsed document, with page/section provenance.
 * Stored in the `chunks` collection via the same repository interface as every
 * other model (lowdb in dev, Postgres JSONB in prod).
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const C = 'chunks';

function buildRecord(orgId, documentId, documentName, chunk) {
  return {
    id: uuidv4(),
    orgId,
    documentId,
    documentName,
    index: chunk.index,
    text: chunk.text,
    page: chunk.page ?? null,
    section: chunk.section ?? null,
    charCount: chunk.text.length,
    createdAt: new Date().toISOString()
  };
}

async function bulkCreate(orgId, documentId, documentName, chunks = []) {
  const created = [];
  for (const chunk of chunks) {
    created.push(await db.insert(C, buildRecord(orgId, documentId, documentName, chunk)));
  }
  return created;
}

async function findByOrg(orgId)        { return db.findMany(C, { orgId }); }
async function findByDocument(docId)   { return db.findMany(C, { documentId: docId }); }

async function removeByDocument(docId) {
  const existing = await findByDocument(docId);
  for (const c of existing) await db.delete(C, c.id);
  return existing.length;
}

/**
 * Replace all chunks for a document in one shot (delete-then-insert) so a
 * re-parse never leaves stale chunks behind.
 */
async function replaceForDocument(orgId, documentId, documentName, chunks = []) {
  await removeByDocument(documentId);
  return bulkCreate(orgId, documentId, documentName, chunks);
}

module.exports = { bulkCreate, findByOrg, findByDocument, removeByDocument, replaceForDocument };
