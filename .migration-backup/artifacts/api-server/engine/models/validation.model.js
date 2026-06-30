/**
 * src/models/validation.model.js
 *
 * Tracks validation results for every extracted claim.
 * Orgni does not just extract — it verifies each finding
 * against the source before adding it to the knowledge map.
 *
 * Validation states:
 *   verified   — claim is supported by source text
 *   uncertain  — claim is plausible but not explicitly stated
 *   rejected   — claim contradicts or is not supported by source
 *   needs_review — confidence is below threshold, human should check
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const C = 'validations';

const CONFIDENCE_THRESHOLD = parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.75');

async function create(data) {
  const status = deriveStatus(data.confidence, data.supported);
  const record = {
    id: uuidv4(),
    orgId: data.orgId,
    mapId: data.mapId,
    insightType: data.insightType,     // workflow | role | rule | risk | gap | opportunity
    claim: data.claim,                 // the extracted statement
    sourceDocumentId: data.sourceDocumentId || null,
    sourceDocumentName: data.sourceDocumentName || null,
    sourceExcerpt: data.sourceExcerpt || null,  // exact text that supports the claim
    confidence: data.confidence || 0,
    supported: data.supported || false,         // is it directly in the source?
    status,
    reason: data.reason || '',
    reviewedBy: null,                           // set when a human confirms
    reviewedAt: null,
    createdAt: new Date().toISOString()
  };
  return db.insert(C, record);
}

function deriveStatus(confidence, supported) {
  if (!supported) return 'rejected';
  if (confidence >= CONFIDENCE_THRESHOLD) return 'verified';
  if (confidence >= 0.5) return 'uncertain';
  return 'needs_review';
}

async function findByMap(mapId)      { return db.findMany(C, { mapId }); }
async function findByOrg(orgId)      { return db.findMany(C, { orgId }); }
async function findNeedsReview(orgId) {
  const all = await findByOrg(orgId);
  return all.filter(v => v.status === 'needs_review' || v.status === 'uncertain');
}

// Resolve a validation record but only if it belongs to the given org.
// Returns null when the record is missing or owned by another org, so that
// callers can return 404 instead of mutating across org boundaries.
async function findByIdForOrg(orgId, id) {
  const record = await db.findOne(C, { id });
  if (!record || record.orgId !== orgId) return null;
  return record;
}

async function humanConfirm(orgId, id, reviewedBy) {
  const existing = await findByIdForOrg(orgId, id);
  if (!existing) return null;
  return db.update(C, id, {
    status: 'verified',
    reviewedBy,
    reviewedAt: new Date().toISOString()
  });
}

async function humanReject(orgId, id, reviewedBy, reason) {
  const existing = await findByIdForOrg(orgId, id);
  if (!existing) return null;
  return db.update(C, id, {
    status: 'rejected',
    reviewedBy,
    reviewedAt: new Date().toISOString(),
    reason
  });
}

/**
 * Human edits a finding's claim and/or supporting excerpt. Records who edited
 * it and marks it verified — a human has taken ownership of the corrected text.
 */
async function humanEdit(orgId, id, patch = {}, reviewedBy) {
  const existing = await findByIdForOrg(orgId, id);
  if (!existing) return null;
  const next = {
    reviewedBy,
    reviewedAt: new Date().toISOString()
  };
  if (patch.claim !== undefined) next.claim = String(patch.claim).trim();
  if (patch.sourceExcerpt !== undefined) next.sourceExcerpt = String(patch.sourceExcerpt).trim();
  if (patch.status !== undefined && ['verified', 'uncertain', 'rejected', 'needs_review'].includes(patch.status)) {
    next.status = patch.status;
  } else {
    next.status = 'verified';
  }
  return db.update(C, id, next);
}

async function getStats(orgId) {
  const all = await findByOrg(orgId);
  return {
    total: all.length,
    verified: all.filter(v => v.status === 'verified').length,
    uncertain: all.filter(v => v.status === 'uncertain').length,
    rejected: all.filter(v => v.status === 'rejected').length,
    needsReview: all.filter(v => v.status === 'needs_review').length,
    averageConfidence: all.length
      ? Math.round((all.reduce((s, v) => s + v.confidence, 0) / all.length) * 100) / 100
      : 0
  };
}

module.exports = { create, findByMap, findByOrg, findNeedsReview, humanConfirm, humanReject, humanEdit, getStats };
