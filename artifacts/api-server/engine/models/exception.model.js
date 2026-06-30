/**
 * src/models/exception.model.js
 *
 * Lightweight exceptions / control gaps surfaced by Orgni.
 *
 * An exception is something that needs a human's attention: a document that
 * failed to parse, a low-confidence finding, a required document that seems to
 * be missing, a conflicting rule, an approval gap, or an answer the assistant
 * could not support from the sources. They can be auto-derived from the current
 * state (scan) or created by hand, and moved between open and resolved.
 *
 * type:     low_confidence | parse_failure | missing_document |
 *           conflicting_rule | approval_gap | unsupported_answer | other
 * severity: low | medium | high
 * status:   open | resolved
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const C = 'exceptions';
const TYPES = [
  'low_confidence', 'parse_failure', 'missing_document',
  'conflicting_rule', 'approval_gap', 'unsupported_answer', 'other'
];
const SEVERITIES = ['low', 'medium', 'high'];

async function create(orgId, data = {}) {
  const record = {
    id: uuidv4(),
    orgId,
    title: String(data.title || '').trim() || 'Untitled exception',
    type: TYPES.includes(data.type) ? data.type : 'other',
    severity: SEVERITIES.includes(data.severity) ? data.severity : 'medium',
    status: data.status === 'resolved' ? 'resolved' : 'open',
    relatedType: data.relatedType || null,   // document | finding | workflow | rule | assistant
    relatedId: data.relatedId || null,
    detail: String(data.detail || '').trim(),
    dedupeKey: data.dedupeKey || null,        // stable key so scans stay idempotent
    source: data.source === 'manual' ? 'manual' : (data.dedupeKey ? 'auto' : 'manual'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    resolvedAt: null
  };
  return db.insert(C, record);
}

async function findByOrg(orgId) {
  return db.findMany(C, { orgId }, { sortBy: 'createdAt', sortDir: 'desc' });
}

async function findById(orgId, id) {
  const record = await db.findById(C, id);
  if (!record || record.orgId !== orgId) return null;
  return record;
}

async function existsByDedupe(orgId, dedupeKey) {
  if (!dedupeKey) return false;
  const all = await db.findMany(C, { orgId });
  return all.some((e) => e.dedupeKey === dedupeKey);
}

/**
 * Insert only if no exception with the same dedupeKey exists for this org
 * (regardless of status), so re-scanning never duplicates and never reopens
 * something a human already resolved. Returns the created record or null.
 */
async function createIfNew(orgId, data = {}) {
  if (await existsByDedupe(orgId, data.dedupeKey)) return null;
  return create(orgId, data);
}

async function update(orgId, id, patch = {}) {
  const existing = await findById(orgId, id);
  if (!existing) return null;
  const next = {};
  if (patch.title !== undefined) next.title = String(patch.title).trim() || existing.title;
  if (patch.detail !== undefined) next.detail = String(patch.detail).trim();
  if (patch.type !== undefined && TYPES.includes(patch.type)) next.type = patch.type;
  if (patch.severity !== undefined && SEVERITIES.includes(patch.severity)) next.severity = patch.severity;
  if (patch.status !== undefined && ['open', 'resolved'].includes(patch.status)) {
    next.status = patch.status;
    next.resolvedAt = patch.status === 'resolved' ? new Date().toISOString() : null;
  }
  return db.update(C, id, next);
}

async function remove(orgId, id) {
  const existing = await findById(orgId, id);
  if (!existing) return false;
  await db.delete(C, id);
  return true;
}

async function getStats(orgId) {
  const all = await findByOrg(orgId);
  return {
    total: all.length,
    open: all.filter((e) => e.status === 'open').length,
    resolved: all.filter((e) => e.status === 'resolved').length
  };
}

module.exports = {
  create, createIfNew, findByOrg, findById, existsByDedupe,
  update, remove, getStats, TYPES, SEVERITIES
};
