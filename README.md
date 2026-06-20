# Orgni Engine — Backend

> The core intelligence layer of Orgni by Olyxee.
> Understands how a business operates. Stores that understanding. Powers Orgni products.

---

## What it is

Orgni Engine is not a chatbot, not a workflow tool, not accounting software.

It is the system that reads business information — documents, descriptions, rules, roles, workflows — extracts the structure, validates every finding against its source, and stores a persistent knowledge map of how the business operates.

Other products (Orgni Workflow, Orgni Finance) plug into this engine and get exactly the context they need.

---

## Architecture

```
Business Input (docs / text / profiles)
              ↓
        INTAKE LAYER
   (parser → corpus builder)
              ↓
      EXTRACTION LAYER
  ┌──────────────────────────────┐
  │ workflow  role  rule  risk   │  ← parallel extractors
  │ opportunity  summary         │
  └──────────────────────────────┘
              ↓
     VALIDATION LAYER
  (confidence score + source check)
              ↓
      KNOWLEDGE MAP
  (versioned, persistent, mergeable)
              ↓
        ENGINE SDK
  ┌─────────────┬──────────────┐
  │   Workflow  │   Finance    │  ← domain-scoped context
  └─────────────┴──────────────┘
```

---

## Quick start

```bash
git clone / unzip orgni-engine
cd orgni
npm install
cp .env.example .env
# Add your AI key to .env
npm start
npm test
```

---

## Swapping the database

Open `src/db/index.js`. Change one line:

```js
// Current (prototype):
const LowdbAdapter = require('./adapters/lowdb.adapter');
module.exports = new LowdbAdapter();

// Production (PostgreSQL):
const PostgresAdapter = require('./adapters/postgres.adapter');
module.exports = new PostgresAdapter();
```

Set `DATABASE_URL` in `.env`. Nothing else changes.

---

## Swapping the AI provider

In `.env`:

```env
# Anthropic (default)
AI_PROVIDER=anthropic
AI_MODEL=claude-sonnet-4-6
AI_API_KEY=sk-ant-...
AI_BASE_URL=https://api.anthropic.com

# Grok (production)
AI_PROVIDER=grok
AI_MODEL=grok-3
AI_API_KEY=xai-...
AI_BASE_URL=https://api.x.ai

# OpenAI
AI_PROVIDER=openai
AI_MODEL=gpt-4o
AI_API_KEY=sk-...
AI_BASE_URL=https://api.openai.com
```

---

## API Reference

### Organisation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orgs` | Create organisation |
| GET | `/api/orgs` | List all organisations |
| GET | `/api/orgs/:id` | Get organisation |
| PATCH | `/api/orgs/:id` | Update profile |
| DELETE | `/api/orgs/:id` | Delete organisation |
| GET | `/api/orgs/:id/dashboard` | Full dashboard |
| GET | `/api/orgs/:id/activity` | Activity log |

### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orgs/:id/documents` | Upload files (multipart, up to 10) |
| GET | `/api/orgs/:id/documents` | List documents |
| GET | `/api/orgs/:id/documents/:docId` | Get document with content |
| DELETE | `/api/orgs/:id/documents/:docId` | Delete document |

Supported: `.txt` `.md` `.csv` `.json` `.pdf` `.docx` (up to 10MB each)

### Engine

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orgs/:id/engine/intake` | Run full intelligence intake |
| GET | `/api/orgs/:id/engine/context` | Full business context |
| GET | `/api/orgs/:id/engine/context/workflow` | Context for Orgni Workflow |
| GET | `/api/orgs/:id/engine/context/finance` | Context for Orgni Finance |
| GET | `/api/orgs/:id/engine/history` | Knowledge map version history |
| POST | `/api/orgs/:id/engine/ask` | Ask grounded question |
| GET | `/api/orgs/:id/engine/validation` | Validation stats + items needing review |
| POST | `/api/orgs/:id/engine/validation/:vid/confirm` | Human confirms a finding |
| POST | `/api/orgs/:id/engine/validation/:vid/reject` | Human rejects a finding |
| GET | `/api/orgs/:id/engine/insights` | All extracted insights (filter by ?type=) |
| POST | `/api/orgs/:id/engine/actions` | Run an AI action |

**Action types:** `task_list` `draft_message` `workflow_summary` `flag_missing` `next_step`

---

## How to use the SDK (for Orgni products)

```js
const OrgniEngine = require('./src/sdk/engine.sdk');

// Run intake after documents are uploaded
await OrgniEngine.intake(orgId, documents);

// Orgni Workflow gets its context
const ctx = await OrgniEngine.forWorkflow(orgId);
// ctx.workflows, ctx.roles, ctx.dependencies, ctx.blueprint

// Orgni Finance gets its context
const ctx = await OrgniEngine.forFinance(orgId);
// ctx.rules, ctx.approvals, ctx.exceptions, ctx.risks

// Ask a grounded question
const result = await OrgniEngine.ask(orgId, 'Who approves payments above R50,000?', docs);
// result.answer, result.grounded, result.sources

// Get validation status
const stats = await OrgniEngine.getValidationStats(orgId);
// stats.verified, stats.needsReview, stats.averageConfidence
```

---

## How memory works

Every document upload triggers:
1. Parse → extract text
2. If no knowledge map exists → full intake on next `/engine/intake` call
3. If knowledge map exists → incremental update (merges new findings, preserves existing)

Knowledge maps are versioned. Every change creates a new version. Old versions are archived, never deleted.

---

## How validation works

Every extracted finding gets a validation record:

- **verified** — directly supported by source text (confidence ≥ 0.75)
- **uncertain** — plausible but not explicit (confidence 0.5–0.75)
- **needs_review** — low confidence, human should check
- **rejected** — contradicts or not supported by source

Humans can confirm or reject any finding via the API. Confirmed findings carry higher weight in future extractions.

---

## Project structure

```
src/
  db/
    index.js                 ← swap DB here (one line)
    repository.interface.js  ← contract all adapters implement
    adapters/
      lowdb.adapter.js       ← current (JSON file)
      postgres.adapter.js    ← ready to implement
    logger.js
  engine/
    orgni.engine.js          ← core intelligence coordinator
    extractors/
      workflow.extractor.js
      role.extractor.js
      rule.extractor.js
      risk.extractor.js
      opportunity.extractor.js
  sdk/
    engine.sdk.js            ← public interface for other products
  models/
    organization.model.js
    document.model.js
    knowledgeMap.model.js    ← persistent business memory
    insight.model.js         ← individual traceable findings
    validation.model.js      ← confidence + source verification
    conversation.model.js
    activity.model.js
  controllers/
    organization.controller.js
    document.controller.js
    engine.controller.js
    intelligence.controller.js
  middleware/
    orgResolver.js           ← org isolation on every route
    errorHandler.js
    requestLogger.js
  validators/
    index.js
  services/
    ai.service.js            ← provider-agnostic AI interface
    parser.service.js        ← file text extraction
    analysis.service.js      ← AI action generation
  routes/
    index.js
  tests/
    orgni.test.js            ← 25 tests
```

---

## Environment variables

```env
PORT=3000
NODE_ENV=development

# AI — swap provider here
AI_PROVIDER=anthropic
AI_MODEL=claude-sonnet-4-6
AI_API_KEY=your_key_here
AI_BASE_URL=https://api.anthropic.com

# Storage
DB_PATH=./data/db.json
UPLOAD_DIR=./uploads
LOG_DIR=./logs
LOG_LEVEL=info

# Validation
CONFIDENCE_THRESHOLD=0.75
```
