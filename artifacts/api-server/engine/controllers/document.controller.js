/**
 * src/controllers/document.controller.js
 */

const path          = require('path');
const docModel      = require('../models/document.model');
const orgModel      = require('../models/organization.model');
const activityModel = require('../models/activity.model');
const OrgniEngine   = require('../sdk/engine.sdk');
const { parseBuffer, ParserError, SUPPORTED_EXTENSIONS } = require('../services/parser.service');
const { asyncHandler } = require('../middleware/errorHandler');
const logger        = require('../db/logger');

const upload = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded. Send files via multipart/form-data with field name "files".' });
  }

  const orgId   = req.org.id;
  const uploaded = [];
  const rejected = [];

  for (const file of req.files) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      rejected.push({ name: file.originalname, reason: `File type "${ext}" is not supported` });
      continue;
    }

    const doc = await docModel.create({
      orgId,
      filename:     file.originalname,
      originalName: file.originalname,
      fileType:     ext,
      filePath:     null,
      fileSize:     file.size
    });

    // Parse in-request from the in-memory buffer (no disk writes). We await so
    // the work completes before the response — serverless functions may freeze
    // immediately after responding, so background parsing is unreliable there.
    const parsed = await parseAndUpdate(doc, orgId, file.buffer);

    uploaded.push({ id: doc.id, name: file.originalname, size: file.size, status: parsed.status });
    await activityModel.log(orgId, 'document_uploaded', `Uploaded "${file.originalname}"`, { docId: doc.id });
  }

  if (uploaded.length === 0) {
    return res.status(400).json({
      error:    'No files could be accepted.',
      rejected,
      supported: [...SUPPORTED_EXTENSIONS].join(', ')
    });
  }

  await orgModel.update(orgId, { knowledgeStatus: 'partial' });

  res.status(201).json({
    message:  `${uploaded.length} file(s) uploaded and queued for parsing`,
    documents: uploaded,
    ...(rejected.length ? { rejected } : {})
  });
});

async function parseAndUpdate(doc, orgId, buffer) {
  try {
    const content = await parseBuffer(buffer, doc.originalName);
    const updated = await docModel.update(doc.id, {
      content,
      wordCount: content.split(/\s+/).length,
      status:    'parsed',
      parsedAt:  new Date().toISOString()
    });
    logger.info('Document parsed', { docId: doc.id, name: doc.originalName, words: updated.wordCount });

    // Trigger incremental engine update if knowledge map already exists
    const allDocs = await docModel.findByOrg(orgId);
    const isReady = await OrgniEngine.isReady(orgId);
    if (isReady) {
      OrgniEngine.update(orgId, updated, allDocs).catch(e =>
        logger.error('Incremental update failed', { docId: doc.id, error: e.message })
      );
    }
    return { status: 'parsed' };
  } catch (err) {
    const parseError = err instanceof ParserError ? err.message : `Parse failed: ${err.message}`;
    await docModel.update(doc.id, { status: 'failed', parseError });
    logger.error('Document parse failed', { docId: doc.id, name: doc.originalName, error: parseError });
    return { status: 'failed', parseError };
  }
}

const list = asyncHandler(async (req, res) => {
  const docs = await docModel.findByOrg(req.org.id);
  res.json({
    count:     docs.length,
    documents: docs.map(d => ({
      id:          d.id,
      name:        d.originalName,
      fileType:    d.fileType,
      fileSize:    d.fileSize,
      status:      d.status,
      parseError:  d.parseError || null,
      wordCount:   d.wordCount,
      uploadedAt:  d.uploadedAt,
      parsedAt:    d.parsedAt
    }))
  });
});

const get = asyncHandler(async (req, res) => {
  const doc = await docModel.findById(req.params.docId);
  if (!doc || doc.orgId !== req.org.id) {
    return res.status(404).json({ error: 'Document not found' });
  }
  res.json({ document: doc });
});

const remove = asyncHandler(async (req, res) => {
  const doc = await docModel.findById(req.params.docId);
  if (!doc || doc.orgId !== req.org.id) {
    return res.status(404).json({ error: 'Document not found' });
  }
  await docModel.remove(doc.id);
  await activityModel.log(req.org.id, 'document_deleted', `Deleted "${doc.originalName}"`);
  res.json({ message: 'Document deleted' });
});

module.exports = { upload, list, get, remove };
