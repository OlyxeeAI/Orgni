const orgModel       = require('../models/organization.model');
const activityModel  = require('../models/activity.model');
const docModel       = require('../models/document.model');
const mapModel       = require('../models/knowledgeMap.model');
const validationModel = require('../models/validation.model');
const workflowModel  = require('../models/workflow.model');
const exceptionModel = require('../models/exception.model');
const { asyncHandler } = require('../middleware/errorHandler');

const create = asyncHandler(async (req, res) => {
  const org = await orgModel.create(req.body);
  await activityModel.log(org.id, 'org_created', `Organization "${org.name}" created`);
  res.status(201).json({ organization: org });
});

const list = asyncHandler(async (req, res) => {
  const organizations = await orgModel.findAll();
  res.json({ organizations });
});

const get = asyncHandler(async (req, res) => {
  const [docs, map] = await Promise.all([
    docModel.findByOrg(req.org.id),
    mapModel.getActive(req.org.id)
  ]);
  res.json({
    organization: req.org,
    documentCount: docs.length,
    hasBusinessMap: !!map,
    knowledgeStatus: req.org.knowledgeStatus
  });
});

const update = asyncHandler(async (req, res) => {
  const updated = await orgModel.update(req.org.id, req.body);
  await activityModel.log(req.org.id, 'org_updated', 'Organization profile updated');
  res.json({ organization: updated });
});

const remove = asyncHandler(async (req, res) => {
  await orgModel.remove(req.org.id);
  res.json({ message: 'Organization deleted' });
});

const dashboard = asyncHandler(async (req, res) => {
  const orgId = req.org.id;
  const [docs, map, activity, vStats, savedWorkflows, exStats] = await Promise.all([
    docModel.findByOrg(orgId),
    mapModel.getActive(orgId),
    activityModel.findByOrg(orgId, 10),
    validationModel.getStats(orgId),
    workflowModel.findByOrg(orgId),
    exceptionModel.getStats(orgId)
  ]);
  res.json({
    organization: req.org,
    knowledge: {
      status: req.org.knowledgeStatus,
      documentCount: docs.length,
      parsedDocuments: docs.filter(d => d.status === 'parsed').length,
      pendingDocuments: docs.filter(d => d.status === 'pending').length
    },
    counts: {
      documents: docs.length,
      failedDocuments: docs.filter(d => d.status === 'failed').length,
      findingsTotal: vStats.total || 0,
      findingsVerified: vStats.verified || 0,
      findingsNeedingReview: vStats.needsReview || 0,
      confidence: typeof vStats.averageConfidence === 'number' ? vStats.averageConfidence : null,
      workflowsSaved: savedWorkflows.length,
      workflowsApproved: savedWorkflows.filter(w => w.status === 'approved').length,
      workflowsDetected: (map?.workflows || []).length,
      exceptionsOpen: exStats.open || 0,
      exceptionsTotal: exStats.total || 0
    },
    summary: map?.businessSummary || null,
    workflows: map?.workflows || [],
    risks: map?.risks || [],
    gaps: map?.gaps || [],
    missingInformation: map?.missingInformation || [],
    recommendedNextSteps: map?.recommendedNextSteps || [],
    recentActivity: activity
  });
});

module.exports = { create, list, get, update, remove, dashboard };
