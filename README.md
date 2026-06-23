# Orgni Engine — Core Engine (Phase 1)

> The core intelligence layer of Orgni by Olyxee.
> Takes business documents in, extracts organisational knowledge, and exposes it through an API.

---

## Status — read this first

**This is the core engine plus a working local UI, not a finished product.** There is intentionally no real auth, no cloud storage, and no deployment hardening yet. The goal right now is one thing only:

> Upload document → parse document → extract organisational knowledge → update knowledge map → expose context through API.

That flow works end to end today, including with real `.pdf` and `.docx` files. Everything below documents what exists, not what is planned.

| Component | Status |
|---|---|
| Document upload + parsing | Working — `.txt` `.md` `.csv` `.json` `.pdf` `.docx` |
| Deterministic extraction (workflows, roles, rules, risks, opportunities) | Working — no LLM or API key required |
| Knowledge map (versioned, queryable) | Working |
| Context API for downstream products (Workflow, Finance) | Working |
| Database | `lowdb` (a JSON file) — fine for this phase, not for multiple concurrent users |
| File storage | Local disk — fine for this phase, not for a real deployment |
| Auth | None | 
| UI | Working React UI served by Express |

Do not read this as "production-ready." It is "the core function works."

---

## What it is

Orgni Engine is not a chatbot, not a workflow tool, not accounting software.

It reads business information — documents, descriptions, rules, roles, workflows — extracts the structure with deterministic parsing by default, validates findings against their source, and stores a persistent, versioned knowledge map of how the business operates.

Other products (**Orgni Workflow**, **Orgni Finance**) plug into this engine through scoped context endpoints and never touch documents, extraction code, or the database directly.

---

## Architecture

```
Business Input (docs / text / profile)
              ↓
        Document parser
   (.txt .md .csv .json .pdf .docx)
              ↓
      Corpus builder (per-source labelled text)
              ↓
      EXTRACTION LAYER (parallel, fault-isolated)
  ┌──────────────────────────────────────┐
  │ workflow · role · rule · risk        │
  │ opportunity · summary                │
  └──────────────────────────────────────┘
              ↓
     VALIDATION LAYER
  (confidence score + source excerpt + status)
              ↓
      KNOWLEDGE MAP
  (versioned — one active map per org, history kept)
              ↓
        ENGINE SDK
  ┌─────────────┬──────────────┐
  │  Workflow   │   Finance    │  ← scoped, typed context only
  │  context    │   context    │
  └─────────────┴──────────────┘
```

---

## Quick start

```bash
unzip orgni-engine.zip && cd orgni
npm install
cp .env.example .env
npm test     # 73 tests, no API key required
npm start    # http://localhost:3000
```

The core Knowledge Map flow does not require `AI_API_KEY`. Optional LLM extraction is only used when `ORGNI_USE_LLM_EXTRACTION=true`.

---

## Verifying the core flow works (dev notes)

The whole point of this phase is: **upload → parse → extract → knowledge map → API**. Here's how to check that's actually working on your machine.

**Option A — zero setup, no API key needed:**

```bash
# terminal 1
NODE_ENV=test npm start

# terminal 2
npm run smoke-test
```

This runs `scripts/smoke-test.sh`, which creates an organisation, uploads `src/tests/fixtures/sample-sop.txt`, builds the Knowledge Map, and prints the resulting map and the workflow/finance-scoped context views.

**Option B — optional LLM extraction:**

```bash
cp .env.example .env
# add AI_API_KEY to .env and set ORGNI_USE_LLM_EXTRACTION=true

# terminal 1
npm start

# terminal 2
npm run smoke-test
```

Same script, same flow, but now `/engine/intake` uses the configured model for extraction. This is optional; the default path is deterministic.

**Option C — automated tests:**

```bash
npm test
```

73 tests covering the same flow plus edge cases (bad uploads, missing keys, org isolation, versioning). The default map builder never makes a real network call.

### AI test stub

When `NODE_ENV=test`, `src/services/ai.service.js` still intercepts explicit AI service calls and returns realistic sample data instead of calling out to a real provider. The main Knowledge Map builder does not use this stub unless optional LLM extraction is enabled. It exists so:
- `npm test` never needs a real API key
- Anyone running the smoke test locally sees a believable knowledge map shape immediately

Set `AI_ENABLED=true` alongside `NODE_ENV=test` to bypass the stub and force real calls even in test mode (used by one regression test that checks the missing-key error path).

---

## Parser support

| Extension | Method | Notes |
|---|---|---|
| `.txt` `.md` | Direct UTF-8 read | Rejects empty files |
| `.csv` | Row/column → labelled text | First 200 rows |
| `.json` | Pretty-printed | Rejects invalid JSON |
| `.pdf` | `pdf-parse` (v1 API) | Rejects scanned/image-only PDFs with no extractable text (`NO_TEXT`) |
| `.docx` | `mammoth` | Extracts raw text, logs any conversion warnings |

Uploads of any other extension are **rejected at upload time** with a clear error listing supported types — they are never silently misread as plain text.

```json
// Example rejection response
{
  "error": "No files could be accepted.",
  "rejected": [{ "name": "script.py", "reason": "File type \".py\" is not supported" }],
  "supported": ".txt, .md, .csv, .json, .pdf, .docx"
}
```

---

## Optional AI provider configuration

The core product does not need a provider. If you explicitly enable optional LLM extraction with `ORGNI_USE_LLM_EXTRACTION=true`, the provider is swappable via environment variables — no code changes.

```env
# Anthropic (default)
AI_PROVIDER=anthropic
AI_MODEL=claude-sonnet-4-6
AI_API_KEY=sk-ant-...
AI_BASE_URL=https://api.anthropic.com

# Grok
AI_PROVIDER=grok
AI_MODEL=grok-3
AI_API_KEY=xai-...
AI_BASE_URL=https://api.x.ai

# OpenAI / any OpenAI-compatible endpoint
AI_PROVIDER=openai
AI_MODEL=gpt-4o
AI_API_KEY=sk-...
AI_BASE_URL=https://api.openai.com
```

Hardening built into `src/services/ai.service.js`:
- **Retry with exponential backoff** on network errors, timeouts, and rate limits (3 attempts)
- **60-second timeout** per call
- **Structured `AIError`** with codes (`MISSING_API_KEY`, `AUTH_ERROR`, `RATE_LIMITED`, `TIMEOUT`, `NETWORK_ERROR`, `INVALID_JSON`) — controllers map these to correct HTTP statuses (503 for config issues, 429 for rate limits, 502 for unknown upstream errors) instead of a blanket 500
- **JSON repair** — strips markdown fences, attempts to extract the first valid `{...}` or `[...]` block before failing
- **Test stub** — when `NODE_ENV=test`, all AI calls return deterministic stub data instead of hitting the network, so `npm test` never needs a real key

---

## API Reference

All routes are prefixed `/api`. This table is generated to match `src/routes/index.js` exactly — if you're unsure, `GET /` returns the live route list from the running server.

### Organisation

| Method | Endpoint | Description |
|---|---|---|
| POST | `/orgs` | Create organisation |
| GET | `/orgs` | List organisations |
| GET | `/orgs/:orgId` | Get organisation |
| PATCH | `/orgs/:orgId` | Update profile |
| DELETE | `/orgs/:orgId` | Delete organisation |
| GET | `/orgs/:orgId/dashboard` | Dashboard summary |
| GET | `/orgs/:orgId/activity` | Activity log |

### Documents

| Method | Endpoint | Description |
|---|---|---|
| POST | `/orgs/:orgId/documents` | Upload files (multipart, field `files`, max 10, 10MB each) |
| GET | `/orgs/:orgId/documents` | List documents |
| GET | `/orgs/:orgId/documents/:docId` | Get document with parsed content |
| DELETE | `/orgs/:orgId/documents/:docId` | Delete document |

### Engine — intake & context

| Method | Endpoint | Description |
|---|---|---|
| POST | `/orgs/:orgId/engine/intake` | Build the Knowledge Map → creates and versions the map |
| GET | `/orgs/:orgId/engine/context` | Full business context |
| GET | `/orgs/:orgId/engine/context/workflow` | Workflow-scoped context (for **Orgni Workflow**) |
| GET | `/orgs/:orgId/engine/context/finance` | Finance-scoped context (for **Orgni Finance**) |
| GET | `/orgs/:orgId/engine/history` | Knowledge map version history |

### Engine — Q&A

| Method | Endpoint | Description |
|---|---|---|
| POST | `/orgs/:orgId/engine/ask` | Ask a grounded question (`{question}`) |

### Engine — validation & traceability

| Method | Endpoint | Description |
|---|---|---|
| GET | `/orgs/:orgId/engine/validation` | Validation stats + items needing review |
| POST | `/orgs/:orgId/engine/validation/:id/confirm` | Human confirms a finding |
| POST | `/orgs/:orgId/engine/validation/:id/reject` | Human rejects a finding (`{reason}`) |
| GET | `/orgs/:orgId/engine/insights` | All extracted insights (`?type=workflow\|role\|rule\|risk\|opportunity`) |

### Engine — actions

| Method | Endpoint | Description |
|---|---|---|
| POST | `/orgs/:orgId/engine/actions` | Generate deterministic action text (`{type: task_list\|draft_message\|workflow_summary\|flag_missing\|next_step}`) |

**Removed in this revision:** `/analyze`, `/map`, `/map/workflows`, `/map/risks`, `/map/blueprint`, top-level `/ask`, top-level `/actions` — these were leftover from an earlier prototype and never matched the actual route table. The `/engine/*` namespace above is the only intelligence API surface.

---

## How Orgni Workflow and Orgni Finance consume context

Neither product talks to documents, the database, or extraction internals. They call the **Engine SDK** (`src/sdk/engine.sdk.js`) or the equivalent HTTP routes, and receive a typed, scoped slice of the knowledge map.

```js
const OrgniEngine = require('./src/sdk/engine.sdk');

// Orgni Workflow
const ctx = await OrgniEngine.forWorkflow(orgId);
// ctx.context.workflows, .roles, .dependencies, .bottlenecks, .blueprint, .missingInformation
// Does NOT include: rules, approvals, exceptions (finance concerns)

// Orgni Finance
const ctx = await OrgniEngine.forFinance(orgId);
// ctx.context.rules, .approvals, .exceptions, .risks, .gaps
// Does NOT include: workflows, blueprint (workflow concerns)
```

Equivalent HTTP:

```bash
GET /api/orgs/:orgId/engine/context/workflow
GET /api/orgs/:orgId/engine/context/finance
```

Both return `404` if `/engine/intake` has not been run yet — there is no fallback to partial or guessed data. A product consuming this context can rely on: if the call succeeds, every field is backed by either an explicit source document or the organisation profile, and every individual finding has a confidence score recorded in the validation layer.

---

## Knowledge map versioning

- Exactly **one active map** per organisation at any time
- Re-running `/engine/intake` **archives the current map and creates a new version** (`version` increments: 1 → 2 → 3 …)
- Archived maps are never deleted — full history is queryable via `/engine/history`
- Incremental document uploads (after the first intake) **merge** into the active map without creating a new version — see `runIncrementalUpdate` in `src/engine/orgni.engine.js`

This is tested explicitly in `src/tests/orgni.test.js` → `describe('Knowledge map versioning')`: three consecutive intakes are run, and the test asserts version numbers, active/archived status, and that `/engine/context` always reflects the latest version.

---

## Validation & traceability

Every extracted finding gets a validation record:

| Status | Meaning |
|---|---|
| `verified` | Directly supported by source text, confidence ≥ `CONFIDENCE_THRESHOLD` (default 0.75) |
| `uncertain` | Plausible but not explicit, confidence 0.5–0.75 |
| `needs_review` | Low confidence, flagged for human review |
| `rejected` | Contradicts or is unsupported by the source |

Humans confirm or reject findings via `POST /engine/validation/:id/confirm|reject`. Both return `404` (not `200` or `500`) if the validation ID doesn't exist.

---

## Failure modes — what each error actually means

| HTTP | Code | Cause |
|---|---|---|
| 400 | `Validation failed` | Request body failed Joi schema validation |
| 400 | — | Upload contained only unsupported file types |
| 404 | — | Organisation, document, or knowledge map not found |
| 404 | — | Validation record ID not found (confirm/reject) |
| 503 | `MISSING_API_KEY` | Optional LLM extraction was enabled but no `AI_API_KEY` was configured |
| 503 | `AUTH_ERROR` | AI provider rejected the API key |
| 429 | `RATE_LIMITED` | AI provider rate limit hit — retried 3× automatically before surfacing |
| 502 | — | Unrecognised upstream AI error |

With default settings, a missing API key does not affect Knowledge Map creation. The regression test proves `/engine/intake` still creates a non-empty deterministic map without an API key.

---

## Testing

```bash
npm test
```

73 tests, zero requiring a real API key. No test accepts `500` as a passing condition — every endpoint either succeeds deterministically or fails with a specific, asserted status code.

Coverage includes:
- Organisation CRUD + validation
- Document upload for all 6 supported types, including **real PDF and DOCX fixtures** parsed end-to-end through the actual upload API (`src/tests/fixtures/sample.pdf`, `sample.docx`)
- Parser error paths: unsupported extension, empty file, invalid JSON, no-extractable-text PDF, corrupt PDF (via mocked `pdf-parse` failures)
- Full intake → context → workflow/finance-scoped context → history, end to end
- Knowledge map versioning across 3 consecutive intakes
- Validation confirm/reject, including the 404 case and a full confirm-cycle against a real record
- Organisation data isolation (cross-org document/context/activity access all correctly blocked)
- A regression test proving a missing API key still produces a deterministic non-empty Knowledge Map

```bash
npm run test:watch   # watch mode during development
```

---

## Project structure

```
src/
  db/
    index.js                 ← swap database here (one line)
    repository.interface.js  ← contract every adapter implements
    adapters/
      lowdb.adapter.js        [PROTOTYPE]
      postgres.adapter.js     ready to activate (npm install pg, set DATABASE_URL)
    logger.js
  engine/
    orgni.engine.js           ← core coordinator: intake, versioning, context, ask
    extractors/
      workflow.extractor.js
      role.extractor.js
      rule.extractor.js
      risk.extractor.js
      opportunity.extractor.js
  sdk/
    engine.sdk.js             ← the only interface Workflow/Finance should use
  models/
    organization.model.js
    document.model.js
    knowledgeMap.model.js     ← versioned business memory
    insight.model.js          ← individual traceable findings
    validation.model.js       ← confidence + source verification
    activity.model.js
  controllers/
    organization.controller.js
    document.controller.js
    engine.controller.js
    intelligence.controller.js
  middleware/
    orgResolver.js            ← org isolation on every :orgId route
    errorHandler.js
    requestLogger.js
  validators/
    index.js                  ← Joi schemas
  services/
    ai.service.js              ← provider-agnostic, retry, timeout, test stub
    parser.service.js          ← real pdf/docx/csv/json/txt/md parsing
    analysis.service.js        ← simple action generation (task lists, summaries)
  routes/
    index.js
  tests/
    orgni.test.js              ← 73 tests
    fixtures/
      sample.pdf
      sample.docx
public/
  index.html                  ← basic UI
```

---

## Database — moving off lowdb

`src/db/index.js` is the single point of integration:

```js
// Current (MVP):
const LowdbAdapter = require('./adapters/lowdb.adapter');
module.exports = new LowdbAdapter();

// Production:
const PostgresAdapter = require('./adapters/postgres.adapter');
module.exports = new PostgresAdapter();
```

`src/db/adapters/postgres.adapter.js` already implements the full `RepositoryInterface` (`insert`, `findById`, `findOne`, `findMany`, `update`, `delete`, `count`) against a JSONB-per-row schema, so models and controllers require **zero changes**. Run `npm install pg`, set `DATABASE_URL`, create tables per `migrations/`, and swap the one line above.

---

## Notes for later (not this phase)

This phase is deliberately scoped to the core engine flow. These are known, intentional gaps — not oversights — listed so they're not mistaken for bugs:

- **No auth.** Anyone with network access to the server can call any endpoint for any org ID. Fine for local development; not fine for anything shared.
- **No UI.** Everything is API-only by design — see the smoke test script for how to exercise it without one.
- **lowdb is a JSON file, not a real database.** It works for one developer at a time. It will not hold up under concurrent writes. The repository interface (`src/db/repository.interface.js`) exists so this can be swapped for Postgres later without touching models or controllers — but that swap is not done yet.
- **Local disk file storage.** Uploaded documents live in `./uploads`. They will not survive a container restart in a real deployment. Not addressed in this phase.
- **No deployment configuration.** No Dockerfile, no process manager config, no production env separation beyond `NODE_ENV`.

When this phase moves toward a real deployment, the natural next steps are: swap the DB adapter, move uploads to object storage, add auth middleware in front of `orgResolver`, and build the UI(s) for Workflow/Finance/Docs on top of the context APIs that already exist.

---

## Environment variables

See `.env.example` for the full annotated list. The core UI and Knowledge Map do not require an AI key. Optional LLM extraction requires `AI_API_KEY` (or `ANTHROPIC_API_KEY`) plus `ORGNI_USE_LLM_EXTRACTION=true`.
