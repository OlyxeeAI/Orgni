/**
 * src/controllers/workflow.controller.js
 *
 * Human-editable workflow management on top of the detected workflows that live
 * in the knowledge map. Detected workflows are read-only suggestions; saved
 * workflows are the operating record a team can edit and review.
 */

const workflowModel = require('../models/workflow.model');
const mapModel      = require('../models/knowledgeMap.model');
const activityModel = require('../models/activity.model');
const { asyncHandler } = require('../middleware/errorHandler');

// Shape a detected (map) workflow into the same fields a saved workflow uses,
// so the UI can render and "save to edit" without translation.
function shapeDetected(w) {
  const steps = (w.steps || []).map((s) => (typeof s === 'string' ? s : s?.step || s?.name || '')).filter(Boolean);
  return {
    name: w.workflow_name || w.name || 'Workflow',
    description: w.description || w.trigger || '',
    steps,
    trigger: w.trigger || null,
    owner: w.owner || null,
    sourceDocumentName: w._sourceDocName || null,
    confidence: typeof w._confidence === 'number' ? w._confidence : null,
    source: 'detected'
  };
}

const list = asyncHandler(async (req, res) => {
  const orgId = req.org.id;
  const [saved, map] = await Promise.all([
    workflowModel.findByOrg(orgId),
    mapModel.getActive(orgId)
  ]);
  const detected = (map?.workflows || []).map(shapeDetected);
  res.json({ workflows: saved, detected });
});

const create = asyncHandler(async (req, res) => {
  const orgId = req.org.id;
  const wf = await workflowModel.create(orgId, req.body || {});
  await activityModel.log(orgId, 'workflow_created', `Workflow "${wf.name}" created`, {
    workflowId: wf.id, source: wf.source
  });
  res.status(201).json({ workflow: wf });
});

const get = asyncHandler(async (req, res) => {
  const wf = await workflowModel.findById(req.org.id, req.params.workflowId);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  res.json({ workflow: wf });
});

const update = asyncHandler(async (req, res) => {
  const orgId = req.org.id;
  const before = await workflowModel.findById(orgId, req.params.workflowId);
  if (!before) return res.status(404).json({ error: 'Workflow not found' });
  const wf = await workflowModel.update(orgId, req.params.workflowId, req.body || {});
  const approved = before.status !== 'approved' && wf.status === 'approved';
  await activityModel.log(
    orgId,
    approved ? 'workflow_approved' : 'workflow_updated',
    approved ? `Workflow "${wf.name}" approved` : `Workflow "${wf.name}" updated`,
    { workflowId: wf.id, status: wf.status }
  );
  res.json({ workflow: wf });
});

const remove = asyncHandler(async (req, res) => {
  const orgId = req.org.id;
  const wf = await workflowModel.findById(orgId, req.params.workflowId);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  await workflowModel.remove(orgId, req.params.workflowId);
  await activityModel.log(orgId, 'workflow_deleted', `Workflow "${wf.name}" deleted`, { workflowId: wf.id });
  res.json({ message: 'Workflow deleted' });
});

module.exports = { list, create, get, update, remove };
