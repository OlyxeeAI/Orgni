/**
 * src/models/knowledgeMap.model.js
 *
 * The Knowledge Map is Orgni Engine's persistent business memory.
 *
 * Rules:
 *   - One ACTIVE map per organisation at any time
 *   - Every rebuild archives the previous version and creates a new one
 *   - Versions start at 1 and increment monotonically
 *   - Archived maps are kept for history — never deleted
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const C = 'knowledgeMaps';

async function create(data) {
  const record = {
    id:      uuidv4(),
    orgId:   data.orgId,
    // BUG FIX: was hardcoded to 1 — must use data.version when provided
    version: typeof data.version === 'number' ? data.version : 1,
    status:  data.status || 'active',

    businessSummary:      data.businessSummary      || null,
    departments:          data.departments           || [],
    roles:                data.roles                 || [],
    workflows:            data.workflows             || [],
    rules:                data.rules                 || [],
    approvals:            data.approvals             || [],
    exceptions:           data.exceptions            || [],
    risks:                data.risks                 || [],
    bottlenecks:          data.bottlenecks           || [],   // stored explicitly
    gaps:                 data.gaps                  || [],
    dependencies:         data.dependencies          || [],
    aiOpportunities:      data.aiOpportunities       || [],
    readiness:            data.readiness             || [],
    blueprint:            data.blueprint             || {},
    missingInformation:   data.missingInformation    || [],
    overallConfidence:    data.overallConfidence      || 0,
    overallRiskScore:     data.overallRiskScore       || 0,
    sourceDocuments:      data.sourceDocuments        || [],
    recommendedNextSteps: data.recommendedNextSteps   || [],

    generatedAt: new Date().toISOString(),
    updatedAt:   new Date().toISOString()
  };
  return db.insert(C, record);
}

/** Active map for an org (there is exactly one, or none). */
async function getActive(orgId) {
  return db.findOne(C, { orgId, status: 'active' });
}

/** Full version history for an org, newest first. */
async function getHistory(orgId) {
  return db.findMany(C, { orgId }, { sortBy: 'version', sortDir: 'desc' });
}

async function findById(id) { return db.findById(C, id); }

/**
 * Archive the current active map and create a new version.
 * Version numbers are read from the current record, not trusted from the caller.
 */
async function createNewVersion(orgId, data) {
  const current = await getActive(orgId);

  if (current) {
    await db.update(C, current.id, { status: 'archived', updatedAt: new Date().toISOString() });
  }

  const newVersion = current ? current.version + 1 : 1;
  return create({ ...data, orgId, version: newVersion, status: 'active' });
}

/**
 * Merge a partial update into the active map without creating a new version.
 * Used by incremental document ingestion.
 */
async function mergeUpdate(orgId, patch) {
  const current = await getActive(orgId);
  if (!current) return null;
  return db.update(C, current.id, {
    ...current,
    ...patch,
    id:        current.id,   // never overwrite PK
    orgId:     current.orgId,
    version:   current.version,
    status:    'active',
    updatedAt: new Date().toISOString()
  });
}

module.exports = { create, getActive, getHistory, findById, createNewVersion, mergeUpdate };
