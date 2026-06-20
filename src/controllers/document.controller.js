const path = require('path');
const fs   = require('fs');
const docModel      = require('../models/document.model');
const orgModel      = require('../models/organization.model');
const activityModel = require('../models/activity.model');
const OrgniEngine   = require('../sdk/engine.sdk');
const { parseFile } = require('../services/parser.service');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../db/logger');

const upload = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  const orgId = req.org.id;
  const uploaded = [];

  for (const file of req.files) {
    const doc = await docModel.create({
      orgId,
      filename: file.filename,
      originalName: file.originalname,
      fileType: path.extname(file.originalname).toLowerCase(),
      filePath: file.path,
      fileSize: file.size
    });
    parseAndUpdate(doc, orgId);
    uploaded.push({ id: doc.id, name: file.originalname, size: file.size, status: 'pending' });
    await activityModel.log(orgId, 'document_uploaded', `Uploaded "${file.originalname}"`, { docId: doc.id });
  }

  await orgModel.update(orgId, { knowledgeStatus: 'partial' });
  res.status(201).json({
    message: `${uploaded.length} document(s) uploaded and queued for parsing`,
    documents: uploaded
  });
});

async function parseAndUpdate(doc, orgId) {
  try {
    const content = await parseFile(doc.filePath, doc.originalName);
    const updated = await docModel.update(doc.id, {
      content, wordCount: content.split(/\s+/).length,
      status: 'parsed', parsedAt: new Date().toISOString()
    });
    logger.info('Document parsed', { docId: doc.id, words: updated.wordCount });

    // Trigger incremental update if a knowledge map already exists
    const allDocs = await docModel.findByOrg(orgId);
    const isReady = await OrgniEngine.isReady(orgId);
    if (isReady) {
      OrgniEngine.update(orgId, updated, allDocs).catch(e =>
        logger.error('Incremental update failed', { docId: doc.id, error: e.message })
      );
    }
  } catch (err) {
    await docModel.update(doc.id, { status: 'failed', parseError: err.message });
    logger.error('Document parse failed', { docId: doc.id, error: err.message });
  }
}

const list = asyncHandler(async (req, res) => {
  const docs = await docModel.findByOrg(req.org.id);
  res.json({
    count: docs.length,
    documents: docs.map(d => ({
      id: d.id, name: d.originalName, fileType: d.fileType,
      fileSize: d.fileSize, status: d.status, wordCount: d.wordCount,
      uploadedAt: d.uploadedAt, parsedAt: d.parsedAt
    }))
  });
});

const get = asyncHandler(async (req, res) => {
  const doc = await docModel.findById(req.params.docId);
  if (!doc || doc.orgId !== req.org.id) return res.status(404).json({ error: 'Document not found' });
  res.json({ document: doc });
});

const remove = asyncHandler(async (req, res) => {
  const doc = await docModel.findById(req.params.docId);
  if (!doc || doc.orgId !== req.org.id) return res.status(404).json({ error: 'Document not found' });
  if (doc.filePath && fs.existsSync(doc.filePath)) fs.unlinkSync(doc.filePath);
  await docModel.remove(doc.id);
  await activityModel.log(req.org.id, 'document_deleted', `Deleted "${doc.originalName}"`);
  res.json({ message: 'Document deleted' });
});

module.exports = { upload, list, get, remove };
