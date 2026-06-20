/**
 * src/models/knowledgeMap.model.js
 *
 * The Knowledge Map is Orgni Engine's persistent business memory.
 * It is NOT regenerated from scratch each time — it is updated incrementally.
 *
 * Structure:
 *   - One active KnowledgeMap per organisation at any time
 *   - Every change creates a new version (the old one is archived)
 *   - Each field tracks its own source, confidence, and review status
 *   - Other products (Workflow, Finance) read from the active map
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const C = 'knowledgeMaps';

/**
 * A single field in the knowledge map, with full traceability.
 */
function makeField(value, sourceDocId, sourceDocName, excerpt, confidence) {
  return {
    value,
    sourceDocumentId: sourceDocId || null,
    sourceDocumentName: sourceDocName || 'organization_profile',
    sourceExcerpt: excerpt || null,
    confidence: confidence || 0.0,
    reviewStatus: 'pending',   // pending | confirmed | rejected
    lastUpdated: new Date().toISOString()
  };
}

async function create(data) {
  const record = {
    id: uuidv4(),
    orgId: data.orgId,
    version: 1,
    status: 'active',          // active | archived | draft

    // Core business understanding
    businessSummary: data.businessSummary || null,
    departments: data.departments || [],
    roles: data.roles || [],
    workflows: data.workflows || [],
    rules: data.rules || [],
    approvals: data.approvals || [],
    risks: data.risks || [],
    gaps: data.gaps || [],
    documents: data.documents || [],
    dependencies: data.dependencies || [],
    exceptions: data.exceptions || [],
    aiOpportunities: data.aiOpportunities || [],
    readiness: data.readiness || [],
    blueprint: data.blueprint || {},

    // Meta
    missingInformation: data.missingInformation || [],
    overallConfidence: data.overallConfidence || 0,
    overallRiskScore: data.overallRiskScore || 0,
    sourceDocuments: data.sourceDocuments || [],
    recommendedNextSteps: data.recommendedNextSteps || [],

    generatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  return db.insert(C, record);
}

/**
 * Get the current active knowledge map for an org.
 */
async function getActive(orgId) {
  return db.findOne(C, { orgId, status: 'active' });
}

/**
 * Get all versions for an org (history).
 */
async function getHistory(orgId) {
  return db.findMany(C, { orgId }, { sortBy: 'version', sortDir: 'desc' });
}

async function findById(id) { return db.findById(C, id); }

/**
 * Archive the current active map, increment version, save new one.
 * This is how memory updates work — always versioned, never destructive.
 */
async function createNewVersion(orgId, data) {
  // Archive current
  const current = await getActive(orgId);
  if (current) {
    await db.update(C, current.id, { status: 'archived' });
  }

  // Create new version
  const newVersion = current ? current.version + 1 : 1;
  return create({ ...data, orgId, version: newVersion });
}

/**
 * Merge a partial update into the active map (for incremental learning).
 * Only updates fields that are provided — preserves everything else.
 */
async function mergeUpdate(orgId, patch) {
  const current = await getActive(orgId);
  if (!current) return null;

  const merged = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString()
  };

  return db.update(C, current.id, merged);
}

module.exports = { create, getActive, getHistory, findById, createNewVersion, mergeUpdate, makeField };
