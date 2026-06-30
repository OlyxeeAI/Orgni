/**
 * src/models/workflow.model.js
 *
 * Editable, reviewable workflow objects.
 *
 * The knowledge map already holds DETECTED workflows (extracted from documents,
 * read-only, regenerated on every intake). This model is the human-editable
 * layer on top: a team member can save a detected workflow, create one by hand,
 * edit its name / description / steps, move it through a review status, and
 * export it. Detected workflows are the source; this is the operating record.
 *
 * Status: draft | review_needed | approved
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const C = 'workflows';
const STATUSES = ['draft', 'review_needed', 'approved'];

function normalizeSteps(steps) {
  if (!Array.isArray(steps)) return [];
  return steps
    .map((s) => (typeof s === 'string' ? s : s?.step || s?.name || ''))
    .map((s) => String(s).trim())
    .filter(Boolean);
}

async function create(orgId, data = {}) {
  const status = STATUSES.includes(data.status) ? data.status : 'draft';
  const record = {
    id: uuidv4(),
    orgId,
    name: String(data.name || '').trim() || 'Untitled workflow',
    description: String(data.description || '').trim(),
    steps: normalizeSteps(data.steps),
    status,
    source: data.source === 'detected' ? 'detected' : 'manual',
    sourceDocumentName: data.sourceDocumentName || null,
    trigger: data.trigger || null,
    owner: data.owner || null,
    confidence: typeof data.confidence === 'number' ? data.confidence : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
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

async function update(orgId, id, patch = {}) {
  const existing = await findById(orgId, id);
  if (!existing) return null;
  const next = {};
  if (patch.name !== undefined) next.name = String(patch.name).trim() || existing.name;
  if (patch.description !== undefined) next.description = String(patch.description).trim();
  if (patch.steps !== undefined) next.steps = normalizeSteps(patch.steps);
  if (patch.status !== undefined && STATUSES.includes(patch.status)) next.status = patch.status;
  if (patch.trigger !== undefined) next.trigger = patch.trigger || null;
  if (patch.owner !== undefined) next.owner = patch.owner || null;
  return db.update(C, id, next);
}

async function remove(orgId, id) {
  const existing = await findById(orgId, id);
  if (!existing) return false;
  await db.delete(C, id);
  return true;
}

module.exports = { create, findByOrg, findById, update, remove, STATUSES };
