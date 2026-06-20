/**
 * index.js — Orgni MVP Server
 */

require('dotenv').config();
const path = require('path');
const express = require('express');
const app = express();

const requestLogger = require('./src/middleware/requestLogger');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');
const routes = require('./src/routes/index');

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// API routes
app.use('/api', routes);

// Health
app.get('/health', (req, res) => res.json({
  status: 'ok',
  service: 'Orgni MVP',
  version: '2.0.0',
  provider: process.env.AI_PROVIDER || 'anthropic',
  model: process.env.AI_MODEL || 'claude-sonnet-4-6',
  timestamp: new Date().toISOString()
}));

// Root info
app.get('/', (req, res) => res.json({
  service: 'Orgni — Organizational Intelligence Layer by Olyxee',
  version: '2.0.0',
  endpoints: {
    'POST   /api/orgs':                          'Create organization',
    'GET    /api/orgs':                          'List organizations',
    'GET    /api/orgs/:id':                      'Get organization',
    'PATCH  /api/orgs/:id':                      'Update organization',
    'GET    /api/orgs/:id/dashboard':            'Full dashboard (workflows, risks, gaps, actions)',
    'POST   /api/orgs/:id/documents':            'Upload documents (multipart)',
    'GET    /api/orgs/:id/documents':            'List documents',
    'DELETE /api/orgs/:id/documents/:docId':     'Delete document',
    'POST   /api/orgs/:id/analyze':              'Run full intelligence analysis',
    'GET    /api/orgs/:id/map':                  'Get full business map',
    'GET    /api/orgs/:id/map/workflows':        'Get workflows',
    'GET    /api/orgs/:id/map/risks':            'Get risks & bottlenecks',
    'GET    /api/orgs/:id/map/blueprint':        'Get AI execution blueprint',
    'POST   /api/orgs/:id/ask':                  'Ask grounded question',
    'POST   /api/orgs/:id/actions':              'Run AI action (task_list | draft_message | workflow_summary | flag_missing | next_step)',
    'GET    /api/orgs/:id/activity':             'Recent activity log'
  }
}));

// Serve UI
app.use(express.static(path.join(__dirname, 'public')));


app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    const logger = require('./src/db/logger');
    logger.info(`Orgni MVP running on port ${PORT}`);
    console.log(`\n🧠 Orgni MVP running on http://localhost:${PORT}`);
    console.log(`   Provider: ${process.env.AI_PROVIDER || 'anthropic'} / ${process.env.AI_MODEL || 'claude-sonnet-4-6'}`);
    console.log(`   Docs: GET http://localhost:${PORT}/\n`);
  });
}

module.exports = app;
