/**
 * index.js — Orgni Engine (Core Engine phase)
 *
 * Scope right now: upload document → parse → extract → knowledge map → API.
 * No auth, no production deployment config — see README "Status" section.
 */

require('dotenv').config();

// ── Environment validation ────────────────────────────────────────────────────
// Warn (not crash) on missing optional config at startup.
// Only crash on truly required config.
const path    = require('path');
const express = require('express');

function validateEnv() {
  const warnings = [];
  if (!process.env.AI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    warnings.push('AI_API_KEY is not set — AI features (intake, ask, actions) will return 503 until configured.');
  }
  if (process.env.NODE_ENV === 'production' && !process.env.DB_PATH) {
    warnings.push('DB_PATH not set — using default data/db.json. Set DB_PATH for a stable production path.');
  }
  return warnings;
}

const app = express();

const requestLogger         = require('./src/middleware/requestLogger');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');
const routes                = require('./src/routes/index');

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// API
app.use('/api', routes);

// Health — safe to call without AI configured
app.get('/health', (req, res) => {
  const hasKey = !!(process.env.AI_API_KEY || process.env.ANTHROPIC_API_KEY);
  res.json({
    status:    'ok',
    service:   'Orgni Engine',
    phase:     'core-engine',
    provider:  process.env.AI_PROVIDER || 'anthropic',
    model:     process.env.AI_MODEL    || 'claude-sonnet-4-6',
    aiReady:   hasKey,
    timestamp: new Date().toISOString()
  });
});

// API info — accurate route documentation (matches src/routes/index.js exactly)
app.get('/api-info', (req, res) => res.json({
  service:  'Orgni Engine — Organizational Intelligence Layer by Olyxee',
  phase:    'core-engine — document intake, extraction, and context API. No UI, no auth yet (intentional).',
  storage:  'lowdb (JSON file) — fine for this phase, not a production database.',
  flow:     'POST /api/orgs → POST /api/orgs/:orgId/documents → POST /api/orgs/:orgId/engine/intake → GET /api/orgs/:orgId/engine/context',
  endpoints: {
    // Organisation
    'POST   /api/orgs':                                          'Create organisation',
    'GET    /api/orgs':                                          'List organisations',
    'GET    /api/orgs/:orgId':                                   'Get organisation',
    'PATCH  /api/orgs/:orgId':                                   'Update organisation profile',
    'DELETE /api/orgs/:orgId':                                   'Delete organisation',
    'GET    /api/orgs/:orgId/dashboard':                         'Dashboard summary',
    'GET    /api/orgs/:orgId/activity':                          'Activity log',
    // Documents
    'POST   /api/orgs/:orgId/documents':                         'Upload documents (multipart/form-data, field: files)',
    'GET    /api/orgs/:orgId/documents':                         'List documents',
    'GET    /api/orgs/:orgId/documents/:docId':                  'Get document with parsed content',
    'DELETE /api/orgs/:orgId/documents/:docId':                  'Delete document',
    // Engine — intake
    'POST   /api/orgs/:orgId/engine/intake':                     'Run full intelligence intake → creates/versions knowledge map',
    // Engine — context (for UI and products)
    'GET    /api/orgs/:orgId/engine/context':                    'Full business context',
    'GET    /api/orgs/:orgId/engine/context/workflow':           'Workflow-scoped context (for Orgni Workflow)',
    'GET    /api/orgs/:orgId/engine/context/finance':            'Finance-scoped context (for Orgni Finance)',
    'GET    /api/orgs/:orgId/engine/history':                    'Knowledge map version history',
    // Engine — Q&A
    'POST   /api/orgs/:orgId/engine/ask':                        'Ask a grounded question (body: {question})',
    // Engine — validation & traceability
    'GET    /api/orgs/:orgId/engine/validation':                 'Validation stats + items needing review',
    'POST   /api/orgs/:orgId/engine/validation/:id/confirm':     'Human confirms a finding',
    'POST   /api/orgs/:orgId/engine/validation/:id/reject':      'Human rejects a finding (body: {reason})',
    'GET    /api/orgs/:orgId/engine/insights':                   'All extracted insights (?type=workflow|role|rule|risk|opportunity)',
    // Engine — actions
    'POST   /api/orgs/:orgId/engine/actions':                    'Generate AI action (body: {type: task_list|draft_message|workflow_summary|flag_missing|next_step})',
  }
}));

// UI
app.use(express.static(path.join(__dirname, 'public')));
// SPA fallback: serve index.html for any non-API GET so refreshes / deep links
// don't 404. API 404s still fall through to the JSON notFound handler below.
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
  const PORT    = process.env.PORT || 3000;
  const logger  = require('./src/db/logger');
  const warnings = validateEnv();

  app.listen(PORT, () => {
    logger.info('Orgni Engine started', { port: PORT });
    console.log(`\n🧠 Orgni Engine running on http://localhost:${PORT}`);
    console.log(`   Provider : ${process.env.AI_PROVIDER || 'anthropic'} / ${process.env.AI_MODEL || 'claude-sonnet-4-6'}`);
    console.log(`   AI ready : ${!!(process.env.AI_API_KEY || process.env.ANTHROPIC_API_KEY)}`);
    if (warnings.length) {
      console.log('\n⚠️  Configuration warnings:');
      warnings.forEach(w => console.log(`   • ${w}`));
    }
    console.log();
  });
}

module.exports = app;
