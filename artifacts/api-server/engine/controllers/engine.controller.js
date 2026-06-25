/**
 * src/controllers/engine.controller.js
 */

const OrgniEngine       = require('../sdk/engine.sdk');
const docModel          = require('../models/document.model');
const activityModel     = require('../models/activity.model');
const { generateAction} = require('../services/analysis.service');
const { asyncHandler }  = require('../middleware/errorHandler');
const { AIError }       = require('../services/ai.service');
const logger            = require('../db/logger');

function handleAIError(err, res) {
  if (err instanceof AIError) {
    const status = err.code === 'MISSING_API_KEY' ? 503
                 : err.code === 'AUTH_ERROR'      ? 503
                 : err.code === 'RATE_LIMITED'    ? 429
                 : 502;
    return res.status(status).json({ error: err.message, code: err.code });
  }
  throw err; // re-throw — asyncHandler will catch and 500
}

const intake = asyncHandler(async (req, res) => {
  const orgId     = req.org.id;
  const documents = await docModel.findByOrg(orgId);

  logger.info('Engine intake requested', { orgId, docs: documents.length });

  let map;
  try {
    map = await OrgniEngine.intake(orgId, documents);
  } catch (err) {
    return handleAIError(err, res);
  }

  res.status(200).json({
    message:    'Knowledge Map built',
    mapId:      map.id,
    version:    map.version,
    confidence: map.overallConfidence,
    summary: {
      departments:      (map.departments      || []).length,
      roles:            (map.roles            || []).length,
      workflows:        (map.workflows        || []).length,
      rules:            (map.rules            || []).length,
      approvals:        (map.approvals        || []).length,
      risks:            (map.risks            || []).length,
      bottlenecks:      (map.bottlenecks      || []).length,
      gaps:             (map.gaps             || []).length,
      aiOpportunities:  (map.aiOpportunities  || []).length,
      missingInformation:(map.missingInformation||[]).length
    }
  });
});

const getContext = asyncHandler(async (req, res) => {
  const ctx = await OrgniEngine.getContext(req.org.id);
  if (!ctx) {
    return res.status(404).json({
      error: 'No knowledge map found. Run POST /api/orgs/:orgId/engine/intake first.'
    });
  }
  res.json({ context: ctx });
});

const getWorkflowContext = asyncHandler(async (req, res) => {
  const ctx = await OrgniEngine.forWorkflow(req.org.id);
  if (!ctx) return res.status(404).json({ error: 'No knowledge map found.' });
  res.json(ctx);
});

const getFinanceContext = asyncHandler(async (req, res) => {
  const ctx = await OrgniEngine.forFinance(req.org.id);
  if (!ctx) return res.status(404).json({ error: 'No knowledge map found.' });
  res.json(ctx);
});

const getHistory = asyncHandler(async (req, res) => {
  const history = await OrgniEngine.getHistory(req.org.id);
  res.json({
    count:    history.length,
    versions: history.map(m => ({
      id:              m.id,
      version:         m.version,
      status:          m.status,
      confidence:      m.overallConfidence,
      generatedAt:     m.generatedAt,
      updatedAt:       m.updatedAt,
      sourceDocuments: (m.sourceDocuments || []).length
    }))
  });
});

const ask = asyncHandler(async (req, res) => {
  const { question } = req.body;
  const orgId        = req.org.id;
  const documents    = (await docModel.findByOrg(orgId)).filter(d => d.status === 'parsed');

  let result;
  try {
    result = await OrgniEngine.ask(orgId, question, documents);
  } catch (err) {
    return handleAIError(err, res);
  }

  await activityModel.log(orgId, 'question_asked', `Q: ${question.slice(0, 80)}`, {
    grounded: result.grounded, sources: result.sources?.length
  });

  res.json(result);
});

const getValidation = asyncHandler(async (req, res) => {
  const stats       = await OrgniEngine.getValidationStats(req.org.id);
  const needsReview = await OrgniEngine.getNeedsReview(req.org.id);
  res.json({ stats, needsReview });
});

const confirmFinding = asyncHandler(async (req, res) => {
  const { validationId } = req.params;
  const reviewedBy       = req.body.reviewedBy || 'user';
  const result           = await OrgniEngine.confirmFinding(validationId, reviewedBy);
  if (!result) return res.status(404).json({ error: `Validation record not found: ${validationId}` });
  res.json({ message: 'Finding confirmed', validation: result });
});

const rejectFinding = asyncHandler(async (req, res) => {
  const { validationId }         = req.params;
  const { reviewedBy = 'user', reason = '' } = req.body;
  const result = await OrgniEngine.rejectFinding(validationId, reviewedBy, reason);
  if (!result) return res.status(404).json({ error: `Validation record not found: ${validationId}` });
  res.json({ message: 'Finding rejected', validation: result });
});

const getInsights = asyncHandler(async (req, res) => {
  const { type } = req.query;
  const insights  = await OrgniEngine.getInsights(req.org.id, type);
  res.json({ count: insights.length, insights });
});

const runAction = asyncHandler(async (req, res) => {
  const { type, context: actionContext = '' } = req.body;
  const orgId     = req.org.id;
  const documents = await docModel.findByOrg(orgId);

  let result;
  try {
    result = await generateAction(type, req.org, documents, actionContext);
  } catch (err) {
    return handleAIError(err, res);
  }

  await activityModel.log(orgId, 'action_run', `Action: ${type}`, { type });
  res.json({ type, result });
});

module.exports = {
  intake, getContext, getWorkflowContext, getFinanceContext,
  getHistory, ask, getValidation, confirmFinding, rejectFinding,
  getInsights, runAction
};
