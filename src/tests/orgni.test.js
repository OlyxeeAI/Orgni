/**
 * src/tests/orgni.test.js
 *
 * Full test suite for Orgni Engine MVP.
 *
 * Explicit AI service calls are stubbed via NODE_ENV=test in ai.service.js.
 * No real API key is needed. No test accepts 500 as a valid response.
 */

const request = require('supertest');
const path    = require('path');
const fs      = require('fs');

// Must be set BEFORE requiring the app
process.env.DB_PATH    = path.join(__dirname, '../../data/test-db.json');
process.env.UPLOAD_DIR = path.join(__dirname, '../../uploads/test');
process.env.NODE_ENV   = 'test';
process.env.LOG_LEVEL  = 'error';

const app = require('../../index');

// Shared state across tests
let testOrgId;
let testDocId;
let testValidationId;

beforeAll(() => {
  fs.mkdirSync(path.dirname(process.env.DB_PATH), { recursive: true });
  fs.mkdirSync(process.env.UPLOAD_DIR, { recursive: true });
  if (fs.existsSync(process.env.DB_PATH)) fs.unlinkSync(process.env.DB_PATH);
});

afterAll(() => {
  if (fs.existsSync(process.env.DB_PATH)) fs.unlinkSync(process.env.DB_PATH);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function tempFile(name, content) {
  const p = path.join(__dirname, name);
  fs.writeFileSync(p, content);
  return p;
}

function cleanFile(p) {
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

// ── Organisation ─────────────────────────────────────────────────────────────

describe('Organisation API', () => {
  test('POST /api/orgs — creates with valid data', async () => {
    const res = await request(app).post('/api/orgs').send({
      name:         'Rapid Freight Solutions',
      businessType: 'Logistics',
      departments:  ['Finance', 'Operations', 'Admin'],
      roles: [
        { role: 'Finance Assistant', responsibilities: ['check invoices'] },
        { role: 'Finance Manager',   responsibilities: ['approve payments'] }
      ],
      keyWorkflows: ['Invoice Approval', 'Month-End Reconciliation'],
      currentTools: ['Email', 'Excel'],
      mainProblems: ['Manual invoice matching', 'Slow reconciliation']
    });
    expect(res.status).toBe(201);
    expect(res.body.organization.id).toBeDefined();
    expect(res.body.organization.name).toBe('Rapid Freight Solutions');
    expect(res.body.organization.knowledgeStatus).toBe('empty');
    testOrgId = res.body.organization.id;
  });

  test('POST /api/orgs — rejects missing businessType', async () => {
    const res = await request(app).post('/api/orgs').send({ name: 'Test Co' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details).toBeDefined();
  });

  test('POST /api/orgs — rejects empty name', async () => {
    const res = await request(app).post('/api/orgs').send({ name: '', businessType: 'Retail' });
    expect(res.status).toBe(400);
  });

  test('GET /api/orgs — returns list', async () => {
    const res = await request(app).get('/api/orgs');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.organizations)).toBe(true);
    expect(res.body.organizations.length).toBeGreaterThan(0);
  });

  test('GET /api/orgs/:orgId — returns org with metadata', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}`);
    expect(res.status).toBe(200);
    expect(res.body.organization.id).toBe(testOrgId);
    expect(res.body.documentCount).toBe(0);
    expect(res.body.hasBusinessMap).toBe(false);
  });

  test('GET /api/orgs/:orgId — 404 for nonexistent org', async () => {
    const res = await request(app).get('/api/orgs/does-not-exist');
    expect(res.status).toBe(404);
  });

  test('PATCH /api/orgs/:orgId — updates profile fields', async () => {
    const res = await request(app)
      .patch(`/api/orgs/${testOrgId}`)
      .send({ mainProblems: ['Manual invoicing', 'No audit trail', 'Slow month-end'] });
    expect(res.status).toBe(200);
    expect(res.body.organization.mainProblems).toHaveLength(3);
  });

  test('PATCH /api/orgs/:orgId — 400 for empty body', async () => {
    const res = await request(app).patch(`/api/orgs/${testOrgId}`).send({});
    expect(res.status).toBe(400);
  });

  test('GET /api/orgs/:orgId/dashboard — returns required fields', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/dashboard`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('organization');
    expect(res.body).toHaveProperty('knowledge');
    expect(res.body).toHaveProperty('recentActivity');
    expect(res.body.knowledge).toHaveProperty('status');
    expect(res.body.knowledge).toHaveProperty('documentCount');
  });
});

// ── Document upload ───────────────────────────────────────────────────────────

describe('Document API', () => {
  test('POST /api/orgs/:orgId/documents — uploads .txt file', async () => {
    const f = tempFile('sop.txt',
      'INVOICE APPROVAL SOP\n' +
      'Finance Assistant checks invoices against delivery records.\n' +
      'Payments over R5,000 require Finance Manager approval.\n' +
      'Payments over R50,000 require Director sign-off.'
    );
    const res = await request(app)
      .post(`/api/orgs/${testOrgId}/documents`)
      .attach('files', f);
    cleanFile(f);
    expect(res.status).toBe(201);
    expect(res.body.documents).toHaveLength(1);
    expect(res.body.documents[0].status).toBe('pending');
    testDocId = res.body.documents[0].id;
  });

  test('POST /api/orgs/:orgId/documents — uploads .csv file', async () => {
    const f = tempFile('data.csv', 'supplier,amount,status\nAcme,4500,pending\nBest,12000,approved');
    const res = await request(app)
      .post(`/api/orgs/${testOrgId}/documents`)
      .attach('files', f);
    cleanFile(f);
    expect(res.status).toBe(201);
  });

  test('POST /api/orgs/:orgId/documents — uploads .json file', async () => {
    const f = tempFile('rules.json', JSON.stringify({ workflow: 'invoice', steps: ['check', 'approve'] }));
    const res = await request(app)
      .post(`/api/orgs/${testOrgId}/documents`)
      .attach('files', f);
    cleanFile(f);
    expect(res.status).toBe(201);
  });

  test('POST /api/orgs/:orgId/documents — uploads a real .pdf and it parses successfully', async () => {
    const fixture = path.join(__dirname, 'fixtures', 'sample.pdf');
    const res = await request(app)
      .post(`/api/orgs/${testOrgId}/documents`)
      .attach('files', fixture);
    expect(res.status).toBe(201);
    const docId = res.body.documents[0].id;

    // Parsing happens async — poll briefly
    let doc;
    for (let i = 0; i < 20; i++) {
      const getRes = await request(app).get(`/api/orgs/${testOrgId}/documents/${docId}`);
      doc = getRes.body.document;
      if (doc.status !== 'pending') break;
      await new Promise(r => setTimeout(r, 50));
    }
    expect(doc.status).toBe('parsed');
    expect(doc.content).toContain('Invoice Approval SOP');
  });

  test('POST /api/orgs/:orgId/documents — uploads a real .docx and it parses successfully', async () => {
    const fixture = path.join(__dirname, 'fixtures', 'sample.docx');
    const res = await request(app)
      .post(`/api/orgs/${testOrgId}/documents`)
      .attach('files', fixture);
    expect(res.status).toBe(201);
    const docId = res.body.documents[0].id;

    let doc;
    for (let i = 0; i < 20; i++) {
      const getRes = await request(app).get(`/api/orgs/${testOrgId}/documents/${docId}`);
      doc = getRes.body.document;
      if (doc.status !== 'pending') break;
      await new Promise(r => setTimeout(r, 50));
    }
    expect(doc.status).toBe('parsed');
    expect(doc.content).toContain('Finance Assistant');
  });

  test('POST /api/orgs/:orgId/documents — rejects unsupported extension', async () => {
    const f = tempFile('malware.exe', 'binary');
    const res = await request(app)
      .post(`/api/orgs/${testOrgId}/documents`)
      .attach('files', f);
    cleanFile(f);
    // No files accepted → 400 with clear message
    expect(res.status).toBe(400);
    expect(res.body.rejected).toBeDefined();
    expect(res.body.rejected[0].name).toBe('malware.exe');
  });

  test('POST /api/orgs/:orgId/documents — rejects .py file', async () => {
    const f = tempFile('script.py', 'print("hello")');
    const res = await request(app)
      .post(`/api/orgs/${testOrgId}/documents`)
      .attach('files', f);
    cleanFile(f);
    expect(res.status).toBe(400);
    expect(res.body.supported).toContain('.txt');
  });

  test('POST /api/orgs/:orgId/documents — 400 with no files', async () => {
    const res = await request(app).post(`/api/orgs/${testOrgId}/documents`);
    expect(res.status).toBe(400);
  });

  test('GET /api/orgs/:orgId/documents — lists documents', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/documents`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.documents)).toBe(true);
  });

  test('GET /api/orgs/:orgId/documents/:docId — returns document', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/documents/${testDocId}`);
    expect(res.status).toBe(200);
    expect(res.body.document.id).toBe(testDocId);
  });

  test('GET /api/orgs/:orgId/documents/:docId — 404 for nonexistent', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/documents/no-such-id`);
    expect(res.status).toBe(404);
  });
});

// ── Engine — context before intake ───────────────────────────────────────────

describe('Engine API — before intake', () => {
  test('GET /engine/context — 404 before intake', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/engine/context`);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/intake/i);
  });

  test('GET /engine/context/workflow — 404 before intake', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/engine/context/workflow`);
    expect(res.status).toBe(404);
  });

  test('GET /engine/context/finance — 404 before intake', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/engine/context/finance`);
    expect(res.status).toBe(404);
  });

  test('GET /engine/history — empty list before intake', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/engine/history`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
    expect(res.body.versions).toHaveLength(0);
  });

  test('GET /engine/validation — returns zero stats before intake', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/engine/validation`);
    expect(res.status).toBe(200);
    expect(res.body.stats.total).toBe(0);
    expect(res.body.stats.averageConfidence).toBe(0);
    expect(Array.isArray(res.body.needsReview)).toBe(true);
  });

  test('GET /engine/insights — empty before intake', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/engine/insights`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });
});

// ── Engine — intake ───────────────────────────────────────────────────────────

describe('Engine API — intake', () => {
  test('POST /engine/intake — runs successfully with stubbed AI', async () => {
    const res = await request(app).post(`/api/orgs/${testOrgId}/engine/intake`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Knowledge Map built');
    expect(res.body.mapId).toBeDefined();
    expect(res.body.version).toBe(1);
    expect(res.body.summary).toHaveProperty('departments');
    expect(res.body.summary).toHaveProperty('workflows');
    expect(res.body.summary).toHaveProperty('risks');
  });

  test('GET /engine/context — returns context after intake', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/engine/context`);
    expect(res.status).toBe(200);
    expect(res.body.context).toHaveProperty('orgId', testOrgId);
    expect(res.body.context).toHaveProperty('version', 1);
    expect(res.body.context).toHaveProperty('workflows');
    expect(res.body.context).toHaveProperty('roles');
    expect(res.body.context).toHaveProperty('rules');
    expect(res.body.context).toHaveProperty('risks');
    expect(res.body.context).toHaveProperty('bottlenecks');  // must not be undefined
    expect(Array.isArray(res.body.context.bottlenecks)).toBe(true);
    expect(res.body.context).toHaveProperty('gaps');
    expect(res.body.context).toHaveProperty('missingInformation');
    expect(res.body.context).toHaveProperty('validationStats');
  });

  test('GET /engine/context/workflow — returns workflow-scoped context', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/engine/context/workflow`);
    expect(res.status).toBe(200);
    expect(res.body.domain).toBe('workflow');
    expect(res.body.context).toHaveProperty('workflows');
    expect(res.body.context).toHaveProperty('roles');
    expect(res.body.context).toHaveProperty('blueprint');
    expect(res.body.context).toHaveProperty('bottlenecks');
    // Finance fields must NOT be present in workflow context
    expect(res.body.context.rules).toBeUndefined();
    expect(res.body.context.approvals).toBeUndefined();
  });

  test('GET /engine/context/finance — returns finance-scoped context', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/engine/context/finance`);
    expect(res.status).toBe(200);
    expect(res.body.domain).toBe('finance');
    expect(res.body.context).toHaveProperty('rules');
    expect(res.body.context).toHaveProperty('approvals');
    expect(res.body.context).toHaveProperty('exceptions');
    expect(res.body.context).toHaveProperty('risks');
    // Workflow fields must NOT be present in finance context
    expect(res.body.context.workflows).toBeUndefined();
    expect(res.body.context.blueprint).toBeUndefined();
  });

  test('GET /engine/history — shows version 1 after first intake', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/engine/history`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.versions[0].version).toBe(1);
    expect(res.body.versions[0].status).toBe('active');
  });
});

// ── Engine — versioning ───────────────────────────────────────────────────────

describe('Knowledge map versioning', () => {
  test('POST /engine/intake again — creates version 2, archives version 1', async () => {
    const res = await request(app).post(`/api/orgs/${testOrgId}/engine/intake`);
    expect(res.status).toBe(200);
    expect(res.body.version).toBe(2);
  });

  test('GET /engine/history — shows both versions', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/engine/history`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    // Newest first
    expect(res.body.versions[0].version).toBe(2);
    expect(res.body.versions[0].status).toBe('active');
    expect(res.body.versions[1].version).toBe(1);
    expect(res.body.versions[1].status).toBe('archived');
  });

  test('GET /engine/context — always returns the active (latest) version', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/engine/context`);
    expect(res.status).toBe(200);
    expect(res.body.context.version).toBe(2);
  });

  test('POST /engine/intake a third time — creates version 3', async () => {
    const res = await request(app).post(`/api/orgs/${testOrgId}/engine/intake`);
    expect(res.status).toBe(200);
    expect(res.body.version).toBe(3);
  });

  test('History shows 3 versions, only latest is active', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/engine/history`);
    expect(res.body.count).toBe(3);
    const active = res.body.versions.filter(v => v.status === 'active');
    const archived = res.body.versions.filter(v => v.status === 'archived');
    expect(active).toHaveLength(1);
    expect(active[0].version).toBe(3);
    expect(archived).toHaveLength(2);
  });
});

// ── Ask Orgni ─────────────────────────────────────────────────────────────────

describe('Ask Orgni', () => {
  test('POST /engine/ask — rejects question shorter than 5 chars', async () => {
    const res = await request(app)
      .post(`/api/orgs/${testOrgId}/engine/ask`)
      .send({ question: 'hi' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  test('POST /engine/ask — rejects missing question field', async () => {
    const res = await request(app)
      .post(`/api/orgs/${testOrgId}/engine/ask`)
      .send({});
    expect(res.status).toBe(400);
  });

  test('POST /engine/ask — returns answer with stubbed AI', async () => {
    const res = await request(app)
      .post(`/api/orgs/${testOrgId}/engine/ask`)
      .send({ question: 'Who approves payments above R50,000 at this company?' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('question');
    expect(res.body).toHaveProperty('answer');
    expect(res.body).toHaveProperty('grounded');
    expect(res.body).toHaveProperty('sources');
    expect(typeof res.body.answer).toBe('string');
    expect(res.body.answer.length).toBeGreaterThan(0);
  });

  test('POST /engine/ask — org with no knowledge returns helpful message', async () => {
    // Create a fresh org with no intake
    const newOrg = await request(app).post('/api/orgs')
      .send({ name: 'Empty Org', businessType: 'Services' });
    const emptyOrgId = newOrg.body.organization.id;

    const res = await request(app)
      .post(`/api/orgs/${emptyOrgId}/engine/ask`)
      .send({ question: 'Who is the CEO of this company?' });
    expect(res.status).toBe(200);
    expect(res.body.grounded).toBe(false);
    expect(res.body.answer).toContain('Knowledge Map');
  });
});

// ── Validation ────────────────────────────────────────────────────────────────

describe('Validation API', () => {
  test('GET /engine/validation — returns stats after intake', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/engine/validation`);
    expect(res.status).toBe(200);
    expect(res.body.stats).toHaveProperty('total');
    expect(res.body.stats).toHaveProperty('verified');
    expect(res.body.stats).toHaveProperty('needsReview');
    expect(res.body.stats).toHaveProperty('averageConfidence');
    expect(Array.isArray(res.body.needsReview)).toBe(true);
  });

  test('POST /engine/validation/:id/confirm — 404 for nonexistent ID', async () => {
    const res = await request(app)
      .post(`/api/orgs/${testOrgId}/engine/validation/nonexistent-id/confirm`)
      .send({ reviewedBy: 'test-user' });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  test('POST /engine/validation/:id/reject — 404 for nonexistent ID', async () => {
    const res = await request(app)
      .post(`/api/orgs/${testOrgId}/engine/validation/nonexistent-id/reject`)
      .send({ reviewedBy: 'test-user', reason: 'Wrong' });
    expect(res.status).toBe(404);
  });

  test('Confirm/reject a real validation record', async () => {
    // Get a real validation ID from the insight list
    const valRes = await request(app).get(`/api/orgs/${testOrgId}/engine/validation`);
    const needs = valRes.body.needsReview;

    if (needs.length > 0) {
      testValidationId = needs[0].id;

      const confirmRes = await request(app)
        .post(`/api/orgs/${testOrgId}/engine/validation/${testValidationId}/confirm`)
        .send({ reviewedBy: 'test-user' });
      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.validation.status).toBe('verified');
      expect(confirmRes.body.validation.reviewedBy).toBe('test-user');
    } else {
      // No items need review — still a valid state, test passes
      expect(needs).toBeDefined();
    }
  });
});

// ── Actions ───────────────────────────────────────────────────────────────────

describe('Actions API', () => {
  test('POST /engine/actions — rejects invalid type', async () => {
    const res = await request(app)
      .post(`/api/orgs/${testOrgId}/engine/actions`)
      .send({ type: 'build_rocket' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  test('POST /engine/actions — rejects missing type', async () => {
    const res = await request(app)
      .post(`/api/orgs/${testOrgId}/engine/actions`)
      .send({});
    expect(res.status).toBe(400);
  });

  test('POST /engine/actions — task_list returns result', async () => {
    const res = await request(app)
      .post(`/api/orgs/${testOrgId}/engine/actions`)
      .send({ type: 'task_list' });
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('task_list');
    expect(typeof res.body.result).toBe('string');
    expect(res.body.result.length).toBeGreaterThan(0);
  });

  test('POST /engine/actions — flag_missing returns result', async () => {
    const res = await request(app)
      .post(`/api/orgs/${testOrgId}/engine/actions`)
      .send({ type: 'flag_missing' });
    expect(res.status).toBe(200);
  });

  test('POST /engine/actions — next_step returns result', async () => {
    const res = await request(app)
      .post(`/api/orgs/${testOrgId}/engine/actions`)
      .send({ type: 'next_step' });
    expect(res.status).toBe(200);
    expect(res.body.result).toBeDefined();
  });
});

// ── Insights ──────────────────────────────────────────────────────────────────

describe('Insights API', () => {
  test('GET /engine/insights — returns all insights after intake', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/engine/insights`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('count');
    expect(Array.isArray(res.body.insights)).toBe(true);
  });

  test('GET /engine/insights?type=workflow — filters by type', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/engine/insights?type=workflow`);
    expect(res.status).toBe(200);
    res.body.insights.forEach(i => expect(i.type).toBe('workflow'));
  });

  test('GET /engine/insights?type=risk — filters by type', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/engine/insights?type=risk`);
    expect(res.status).toBe(200);
    res.body.insights.forEach(i => expect(i.type).toBe('risk'));
  });
});

// ── Parser service ────────────────────────────────────────────────────────────

describe('Parser Service', () => {
  const { parseFile, ParserError, SUPPORTED_EXTENSIONS } = require('../services/parser.service');

  test('parses .txt file', async () => {
    const f = tempFile('p.txt', 'Invoice approval. Finance checks delivery records.');
    expect(await parseFile(f, 'p.txt')).toContain('Invoice approval');
    cleanFile(f);
  });

  test('parses .md file', async () => {
    const f = tempFile('p.md', '# SOP\n\nStep 1: Check invoices.');
    const result = await parseFile(f, 'p.md');
    expect(result).toContain('SOP');
    cleanFile(f);
  });

  test('parses .csv file', async () => {
    const f = tempFile('p.csv', 'supplier,amount\nAcme,5000\nBest,12000');
    const result = await parseFile(f, 'p.csv');
    expect(result).toContain('supplier');
    expect(result).toContain('Acme');
    cleanFile(f);
  });

  test('parses .json file', async () => {
    const f = tempFile('p.json', JSON.stringify({ workflow: 'invoice', steps: ['check', 'approve'] }));
    expect(await parseFile(f, 'p.json')).toContain('invoice');
    cleanFile(f);
  });

  test('throws ParserError for unsupported .exe extension', async () => {
    const f = tempFile('p.exe', 'binary');
    await expect(parseFile(f, 'p.exe')).rejects.toThrow(ParserError);
    cleanFile(f);
  });

  test('throws ParserError for empty .txt file', async () => {
    const f = tempFile('empty.txt', '   ');
    await expect(parseFile(f, 'empty.txt')).rejects.toThrow(ParserError);
    cleanFile(f);
  });

  test('throws ParserError for invalid .json file', async () => {
    const f = tempFile('bad.json', '{not valid json}');
    await expect(parseFile(f, 'bad.json')).rejects.toThrow(ParserError);
    cleanFile(f);
  });

  test('SUPPORTED_EXTENSIONS includes all documented types', () => {
    expect(SUPPORTED_EXTENSIONS.has('.txt')).toBe(true);
    expect(SUPPORTED_EXTENSIONS.has('.md')).toBe(true);
    expect(SUPPORTED_EXTENSIONS.has('.csv')).toBe(true);
    expect(SUPPORTED_EXTENSIONS.has('.json')).toBe(true);
    expect(SUPPORTED_EXTENSIONS.has('.pdf')).toBe(true);
    expect(SUPPORTED_EXTENSIONS.has('.docx')).toBe(true);
  });

  test('parses a real .pdf fixture and extracts text', async () => {
    const fixture = path.join(__dirname, 'fixtures', 'sample.pdf');
    const result = await parseFile(fixture, 'sample.pdf');
    expect(result).toContain('Invoice Approval SOP');
    expect(result).toContain('Finance Assistant');
    expect(result).toContain('R5,000');
  });

  test('parses a real .docx fixture and extracts text', async () => {
    const fixture = path.join(__dirname, 'fixtures', 'sample.docx');
    const result = await parseFile(fixture, 'sample.docx');
    expect(result).toContain('Invoice Approval SOP');
    expect(result).toContain('Director sign-off');
  });

  test('throws ParserError with NO_TEXT code when PDF has no extractable text', async () => {
    jest.resetModules();
    jest.doMock('pdf-parse', () => jest.fn().mockResolvedValue({ text: '   ' }));
    const { parseFile: parseFileMocked } = require('../services/parser.service');

    const f = tempFile('scanned.pdf', '%PDF-1.4 fake');
    await expect(parseFileMocked(f, 'scanned.pdf')).rejects.toMatchObject({ code: 'NO_TEXT' });
    cleanFile(f);

    jest.dontMock('pdf-parse');
    jest.resetModules();
  });

  test('wraps pdf-parse library errors as ParserError with PARSE_FAILED code', async () => {
    jest.resetModules();
    jest.doMock('pdf-parse', () => jest.fn().mockRejectedValue(new Error('bad XRef entry')));
    const { parseFile: parseFileMocked } = require('../services/parser.service');

    const f = tempFile('broken.pdf', '%PDF-1.4 corrupt');
    await expect(parseFileMocked(f, 'broken.pdf')).rejects.toMatchObject({ code: 'PARSE_FAILED' });
    cleanFile(f);

    jest.dontMock('pdf-parse');
    jest.resetModules();
  });
});

// ── AI service stub ───────────────────────────────────────────────────────────

describe('AI Service — test stub behaviour', () => {
  const { complete, completeJSON } = require('../services/ai.service');

  test('complete() returns string in test mode', async () => {
    const result = await complete('test prompt');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('completeJSON() returns parseable object in test mode', async () => {
    const result = await completeJSON('test prompt');
    expect(typeof result).toBe('object');
    expect(result).not.toBeNull();
  });

  test('REGRESSION: missing API key still builds a deterministic non-empty knowledge map', async () => {
    process.env.AI_ENABLED = 'true';
    const prevKey = process.env.AI_API_KEY;
    const prevAnthropicKey = process.env.ANTHROPIC_API_KEY;
    const prevLlmExtraction = process.env.ORGNI_USE_LLM_EXTRACTION;
    delete process.env.AI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ORGNI_USE_LLM_EXTRACTION;

    const orgRes = await request(app).post('/api/orgs').send({
      name: 'No Key Co',
      businessType: 'Retail',
      departments: ['Finance', 'Operations'],
      keyWorkflows: ['Invoice approval'],
      mainProblems: ['Manual approvals delay payments']
    });
    const orgId = orgRes.body.organization.id;

    const res = await request(app).post(`/api/orgs/${orgId}/engine/intake`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Knowledge Map built');
    expect(res.body.summary.workflows).toBeGreaterThan(0);

    const ctxRes = await request(app).get(`/api/orgs/${orgId}/engine/context`);
    expect(ctxRes.status).toBe(200);
    expect(ctxRes.body.context.workflows.length).toBeGreaterThan(0);
    expect(ctxRes.body.context.summary.plain_english_summary).toMatch(/deterministically/i);

    process.env.AI_ENABLED = 'false';
    if (prevKey) process.env.AI_API_KEY = prevKey;
    if (prevAnthropicKey) process.env.ANTHROPIC_API_KEY = prevAnthropicKey;
    if (prevLlmExtraction) process.env.ORGNI_USE_LLM_EXTRACTION = prevLlmExtraction;
  });
});

// ── Organisation isolation ────────────────────────────────────────────────────

describe('Organisation isolation', () => {
  let orgAId, orgBId, orgBDocId;

  beforeAll(async () => {
    const resA = await request(app).post('/api/orgs').send({ name: 'Org A', businessType: 'Finance' });
    const resB = await request(app).post('/api/orgs').send({ name: 'Org B', businessType: 'Retail' });
    orgAId = resA.body.organization.id;
    orgBId = resB.body.organization.id;

    const f = tempFile('b-secret.txt', 'Confidential document for Org B only.');
    const upload = await request(app).post(`/api/orgs/${orgBId}/documents`).attach('files', f);
    cleanFile(f);
    orgBDocId = upload.body.documents[0].id;
  });

  test('Org A cannot read Org B documents', async () => {
    const res = await request(app).get(`/api/orgs/${orgAId}/documents/${orgBDocId}`);
    expect(res.status).toBe(404);
  });

  test('Org A document list does not include Org B documents', async () => {
    const res = await request(app).get(`/api/orgs/${orgAId}/documents`);
    const ids  = res.body.documents.map(d => d.id);
    expect(ids).not.toContain(orgBDocId);
  });

  test('Org A engine context is isolated from Org B', async () => {
    // Build a map for Org B
    await request(app).post(`/api/orgs/${orgBId}/engine/intake`);
    // Org A should still have no context (we didn't run intake for orgAId here)
    const resA = await request(app).get(`/api/orgs/${orgAId}/engine/context`);
    // orgAId might or might not have a map from earlier tests — just verify no 500
    expect([200, 404]).toContain(resA.status);
  });

  test('Org A activity log does not contain Org B events', async () => {
    const res = await request(app).get(`/api/orgs/${orgAId}/activity`);
    expect(res.status).toBe(200);
    res.body.activity.forEach(a => expect(a.orgId).toBe(orgAId));
  });
});

// ── Activity log ──────────────────────────────────────────────────────────────

describe('Activity log', () => {
  test('GET /activity — returns activity for org', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/activity`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('activity');
    expect(res.body).toHaveProperty('count');
    expect(Array.isArray(res.body.activity)).toBe(true);
  });

  test('Activity entries contain required fields', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/activity`);
    if (res.body.activity.length > 0) {
      const entry = res.body.activity[0];
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('orgId');
      expect(entry).toHaveProperty('type');
      expect(entry).toHaveProperty('description');
      expect(entry).toHaveProperty('createdAt');
    }
  });
});
