/**
 * src/routes/index.js
 */

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();

const orgResolver = require('../middleware/orgResolver');
const { validate, createOrgSchema, updateOrgSchema, askSchema, chatSchema, actionSchema } = require('../validators');

const orgCtrl    = require('../controllers/organization.controller');
const docCtrl    = require('../controllers/document.controller');
const intelCtrl  = require('../controllers/intelligence.controller');
const engineCtrl = require('../controllers/engine.controller');

// ── File upload ──────────────────────────────────────────────────────────────
// We accept all files here and let the parser service reject unsupported types
// with a clean error. This gives us better error messages than multer's fileFilter.

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Files are isolated per organisation
    const dir = path.join(UPLOAD_DIR, req.params.orgId || 'tmp');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 10 } // 10MB per file, max 10 files
});

// ── Organisation ─────────────────────────────────────────────────────────────
router.post  ('/orgs',           validate(createOrgSchema), orgCtrl.create);
router.get   ('/orgs',           orgCtrl.list);
router.get   ('/orgs/:orgId',    orgResolver, orgCtrl.get);
router.patch ('/orgs/:orgId',    orgResolver, validate(updateOrgSchema), orgCtrl.update);
router.delete('/orgs/:orgId',    orgResolver, orgCtrl.remove);
router.get   ('/orgs/:orgId/dashboard', orgResolver, orgCtrl.dashboard);
router.get   ('/orgs/:orgId/activity',  orgResolver, intelCtrl.getActivity);

// ── Documents ────────────────────────────────────────────────────────────────
router.post  ('/orgs/:orgId/documents',          orgResolver, upload.array('files', 10), docCtrl.upload);
router.get   ('/orgs/:orgId/documents',          orgResolver, docCtrl.list);
router.get   ('/orgs/:orgId/documents/:docId',   orgResolver, docCtrl.get);
router.delete('/orgs/:orgId/documents/:docId',   orgResolver, docCtrl.remove);

// ── Orgni Engine ─────────────────────────────────────────────────────────────

// Intake & context
router.post('/orgs/:orgId/engine/intake',            orgResolver, engineCtrl.intake);
router.get ('/orgs/:orgId/engine/context',           orgResolver, engineCtrl.getContext);
router.get ('/orgs/:orgId/engine/context/workflow',  orgResolver, engineCtrl.getWorkflowContext);
router.get ('/orgs/:orgId/engine/context/finance',   orgResolver, engineCtrl.getFinanceContext);
router.get ('/orgs/:orgId/engine/history',           orgResolver, engineCtrl.getHistory);

// Grounded Q&A
router.post('/orgs/:orgId/engine/ask',               orgResolver, validate(askSchema), engineCtrl.ask);

// Conversational assistant
router.post('/orgs/:orgId/engine/chat',              orgResolver, validate(chatSchema), engineCtrl.chat);

// Validation & traceability
router.get ('/orgs/:orgId/engine/validation',                                   orgResolver, engineCtrl.getValidation);
router.post('/orgs/:orgId/engine/validation/:validationId/confirm',             orgResolver, engineCtrl.confirmFinding);
router.post('/orgs/:orgId/engine/validation/:validationId/reject',              orgResolver, engineCtrl.rejectFinding);
router.get ('/orgs/:orgId/engine/insights',                                     orgResolver, engineCtrl.getInsights);

// Actions
router.post('/orgs/:orgId/engine/actions',           orgResolver, validate(actionSchema), engineCtrl.runAction);

module.exports = router;
