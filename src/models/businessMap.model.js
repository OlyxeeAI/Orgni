const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const C = 'businessMaps';

async function create(data) {
  const record = {
    id: uuidv4(),
    orgId: data.orgId,
    version: data.version || 1,
    summary: data.summary || {},
    departments: data.departments || [],
    workflows: data.workflows || [],
    roles: data.roles || [],
    approvals: data.approvals || {},
    risks: data.risks || {},
    aiOpportunities: data.aiOpportunities || {},
    readiness: data.readiness || {},
    blueprint: data.blueprint || {},
    missingInformation: data.missingInformation || [],
    recommendedNextSteps: data.recommendedNextSteps || [],
    sourceDocuments: data.sourceDocuments || [],
    confidence: data.confidence || 0,
    generatedAt: new Date().toISOString()
  };
  return db.insert(C, record);
}

async function findLatestByOrg(orgId) {
  const maps = await db.findMany(C, { orgId }, { sortBy: 'generatedAt', sortDir: 'desc' });
  return maps[0] || null;
}

async function findAllByOrg(orgId) { return db.findMany(C, { orgId }); }
async function findById(id)        { return db.findById(C, id); }

module.exports = { create, findLatestByOrg, findAllByOrg, findById };
