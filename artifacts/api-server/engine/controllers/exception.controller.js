/**
 * src/controllers/exception.controller.js
 *
 * Basic exceptions: things needing a human's attention, either derived from the
 * current state (scan) or created by hand, and moved between open and resolved.
 */

const exceptionModel = require('../models/exception.model');
const validationModel = require('../models/validation.model');
const docModel       = require('../models/document.model');
const mapModel       = require('../models/knowledgeMap.model');
const activityModel  = require('../models/activity.model');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Derive exceptions from the org's current state. Idempotent: each derived
 * exception has a stable dedupeKey, so re-scanning never duplicates and never
 * reopens anything a human already resolved. Returns the number created.
 */
async function scanOrg(orgId) {
  const [docs, validations, map] = await Promise.all([
    docModel.findByOrg(orgId),
    validationModel.findByOrg(orgId),
    mapModel.getActive(orgId)
  ]);

  const candidates = [];

  // 1. Documents that failed to parse.
  docs.filter((d) => d.status === 'failed').forEach((d) => {
    candidates.push({
      dedupeKey: `parse_failure:${d.id}`,
      title: `Could not read "${d.originalName || d.filename}"`,
      type: 'parse_failure',
      severity: 'high',
      relatedType: 'document',
      relatedId: d.id,
      detail: d.parseError || 'The document failed to parse and was not added to the knowledge base.'
    });
  });

  // 2. Low-confidence / unreviewed findings.
  validations
    .filter((v) => (v.status === 'needs_review' || v.status === 'uncertain') && !v.reviewedAt)
    .forEach((v) => {
      candidates.push({
        dedupeKey: `low_confidence:${v.id}`,
        title: `Low-confidence finding needs review`,
        type: 'low_confidence',
        severity: v.status === 'needs_review' ? 'medium' : 'low',
        relatedType: 'finding',
        relatedId: v.id,
        detail: v.claim || 'A finding was extracted with low confidence and has not been reviewed.'
      });
    });

  // 3. Missing information the engine itself flagged.
  (map?.missingInformation || []).forEach((item) => {
    const text = typeof item === 'string' ? item : (item.item || item.gap || JSON.stringify(item));
    candidates.push({
      dedupeKey: `missing_document:${text.slice(0, 80).toLowerCase()}`,
      title: 'Missing information',
      type: 'missing_document',
      severity: 'medium',
      relatedType: 'knowledge',
      relatedId: null,
      detail: text
    });
  });

  let created = 0;
  for (const c of candidates) {
    const rec = await exceptionModel.createIfNew(orgId, c);
    if (rec) created += 1;
  }
  if (created > 0) {
    await activityModel.log(orgId, 'exceptions_scanned', `${created} exception(s) detected`, { created });
  }
  return created;
}

const list = asyncHandler(async (req, res) => {
  const orgId = req.org.id;
  if (req.query.scan === 'true') {
    await scanOrg(orgId);
  }
  const [exceptions, stats] = await Promise.all([
    exceptionModel.findByOrg(orgId),
    exceptionModel.getStats(orgId)
  ]);
  res.json({ exceptions, stats });
});

const scan = asyncHandler(async (req, res) => {
  const created = await scanOrg(req.org.id);
  const exceptions = await exceptionModel.findByOrg(req.org.id);
  res.json({ created, exceptions });
});

const create = asyncHandler(async (req, res) => {
  const orgId = req.org.id;
  const ex = await exceptionModel.create(orgId, { ...(req.body || {}), source: 'manual' });
  await activityModel.log(orgId, 'exception_opened', `Exception "${ex.title}" opened`, {
    exceptionId: ex.id, type: ex.type
  });
  res.status(201).json({ exception: ex });
});

const update = asyncHandler(async (req, res) => {
  const orgId = req.org.id;
  const before = await exceptionModel.findById(orgId, req.params.exceptionId);
  if (!before) return res.status(404).json({ error: 'Exception not found' });
  const ex = await exceptionModel.update(orgId, req.params.exceptionId, req.body || {});
  if (before.status !== ex.status) {
    const resolved = ex.status === 'resolved';
    await activityModel.log(
      orgId,
      resolved ? 'exception_resolved' : 'exception_reopened',
      `Exception "${ex.title}" ${resolved ? 'resolved' : 'reopened'}`,
      { exceptionId: ex.id }
    );
  }
  res.json({ exception: ex });
});

const remove = asyncHandler(async (req, res) => {
  const orgId = req.org.id;
  const ok = await exceptionModel.remove(orgId, req.params.exceptionId);
  if (!ok) return res.status(404).json({ error: 'Exception not found' });
  res.json({ message: 'Exception deleted' });
});

module.exports = { list, scan, create, update, remove, scanOrg };
