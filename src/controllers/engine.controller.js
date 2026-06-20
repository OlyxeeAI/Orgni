/**
 * src/controllers/engine.controller.js
 *
 * Exposes Orgni Engine capabilities via REST API.
 * This is what the future UI and other products call.
 */

const OrgniEngine = require('../sdk/engine.sdk');
const docModel = require('../models/document.model');
const activityModel = require('../models/activity.model');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../db/logger');

/**
 * POST /api/orgs/:orgId/engine/intake
 * Run full intelligence intake.
 */
const intake = asyncHandler(async (req, res) => {
  const orgId = req.org.id;
  const documents = await docModel.findByOrg(orgId);

  logger.info('Engine intake requested', { orgId, docs: documents.length });
  const map = await OrgniEngine.intake(orgId, documents);

  res.status(200).json({
    message: 'Intelligence intake complete',
    mapId: map.id,
    version: map.version,
    confidence: map.overallConfidence,
    summary: {
      departments: (map.departments || []).length,
      roles: (map.roles || []).length,
      workflows: (map.workflows || []).length,
      rules: (map.rules || []).length,
      approvals: (map.approvals || []).length,
      risks: (map.risks || []).length,
      gaps: (map.gaps || []).length,
      aiOpportunities: (map.aiOpportunities || []).length,
      missingInformation: (map.missingInformation || []).length
    }
  });
});

/**
 * GET /api/orgs/:orgId/engine/context
 * Full business context — used by the UI.
 */
const getContext = asyncHandler(async (req, res) => {
  const ctx = await OrgniEngine.getContext(req.org.id);
  if (!ctx) {
    return res.status(404).json({
      error: 'No knowledge map found. Run POST /engine/intake first.'
    });
  }
  res.json({ context: ctx });
});

/**
 * GET /api/orgs/:orgId/engine/context/workflow
 * Context for Orgni Workflow.
 */
const getWorkflowContext = asyncHandler(async (req, res) => {
  const ctx = await OrgniEngine.forWorkflow(req.org.id);
  if (!ctx) return res.status(404).json({ error: 'No knowledge map found.' });
  res.json(ctx);
});

/**
 * GET /api/orgs/:orgId/engine/context/finance
 * Context for Orgni Finance.
 */
const getFinanceContext = asyncHandler(async (req, res) => {
  const ctx = await OrgniEngine.forFinance(req.org.id);
  if (!ctx) return res.status(404).json({ error: 'No knowledge map found.' });
  res.json(ctx);
});

/**
 * GET /api/orgs/:orgId/engine/history
 * All knowledge map versions — shows how the business understanding evolved.
 */
const getHistory = asyncHandler(async (req, res) => {
  const history = await OrgniEngine.getHistory(req.org.id);
  res.json({
    count: history.length,
    versions: history.map(m => ({
      id: m.id,
      version: m.version,
      status: m.status,
      confidence: m.overallConfidence,
      generatedAt: m.generatedAt,
      sourceDocuments: m.sourceDocuments?.length || 0
    }))
  });
});

/**
 * POST /api/orgs/:orgId/engine/ask
 * Ask a grounded question. Never guesses.
 */
const ask = asyncHandler(async (req, res) => {
  const { question } = req.body;
  const orgId = req.org.id;
  const documents = await docModel.findByOrg(orgId);
  const parsed = documents.filter(d => d.status === 'parsed');

  const result = await OrgniEngine.ask(orgId, question, parsed);

  await activityModel.log(orgId, 'question_asked', `Q: ${question.slice(0, 80)}`, {
    grounded: result.grounded, sources: result.sources?.length
  });

  res.json(result);
});

/**
 * GET /api/orgs/:orgId/engine/validation
 * Validation stats — how confident is Orgni in what it extracted?
 */
const getValidation = asyncHandler(async (req, res) => {
  const stats = await OrgniEngine.getValidationStats(req.org.id);
  const needsReview = await OrgniEngine.getNeedsReview(req.org.id);
  res.json({ stats, needsReview });
});

/**
 * POST /api/orgs/:orgId/engine/validation/:validationId/confirm
 * Human confirms a finding.
 */
const confirmFinding = asyncHandler(async (req, res) => {
  const { validationId } = req.params;
  const reviewedBy = req.body.reviewedBy || 'user';
  const result = await OrgniEngine.confirmFinding(validationId, reviewedBy);
  res.json({ message: 'Finding confirmed', validation: result });
});

/**
 * POST /api/orgs/:orgId/engine/validation/:validationId/reject
 * Human rejects a finding.
 */
const rejectFinding = asyncHandler(async (req, res) => {
  const { validationId } = req.params;
  const { reviewedBy = 'user', reason = '' } = req.body;
  const result = await OrgniEngine.rejectFinding(validationId, reviewedBy, reason);
  res.json({ message: 'Finding rejected', validation: result });
});

/**
 * GET /api/orgs/:orgId/engine/insights
 * All extracted insights, optionally filtered by type.
 */
const getInsights = asyncHandler(async (req, res) => {
  const { type } = req.query;
  const insights = await OrgniEngine.getInsights(req.org.id, type);
  res.json({ count: insights.length, insights });
});

/**
 * POST /api/orgs/:orgId/engine/actions
 * Simple AI actions scoped to the business context.
 */
const runAction = asyncHandler(async (req, res) => {
  const { type, context: actionContext = '' } = req.body;
  const orgId = req.org.id;
  const documents = await docModel.findByOrg(orgId);
  const ctx = await OrgniEngine.getContext(orgId);

  const { generateAction } = require('../services/analysis.service');
  const result = await generateAction(type, req.org, documents.filter(d => d.status === 'parsed'), actionContext);

  await activityModel.log(orgId, 'action_run', `Action: ${type}`, { type });
  res.json({ type, result });
});

module.exports = {
  intake, getContext, getWorkflowContext, getFinanceContext,
  getHistory, ask, getValidation, confirmFinding, rejectFinding,
  getInsights, runAction
};
