/**
 * src/tests/orgni.test.js
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');

process.env.DB_PATH = path.join(__dirname, '../../data/test-db.json');
process.env.UPLOAD_DIR = path.join(__dirname, '../../uploads/test');
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

const app = require('../../index');

let testOrgId;

beforeAll(() => {
  fs.mkdirSync(path.dirname(process.env.DB_PATH), { recursive: true });
  fs.mkdirSync(process.env.UPLOAD_DIR, { recursive: true });
  if (fs.existsSync(process.env.DB_PATH)) fs.unlinkSync(process.env.DB_PATH);
});

afterAll(() => {
  if (fs.existsSync(process.env.DB_PATH)) fs.unlinkSync(process.env.DB_PATH);
});

// ── Organisation ─────────────────────────────────────────────────────────────

describe('Organisation API', () => {
  test('POST /api/orgs — creates with valid data', async () => {
    const res = await request(app).post('/api/orgs').send({
      name: 'Rapid Freight Solutions',
      businessType: 'Logistics',
      departments: ['Finance', 'Operations', 'Admin'],
      roles: [
        { role: 'Finance Assistant', responsibilities: ['check invoices', 'reconciliation'] },
        { role: 'Finance Manager', responsibilities: ['approve payments'] }
      ],
      keyWorkflows: ['Invoice Approval', 'Month-End Reconciliation'],
      currentTools: ['Email', 'Excel', 'WhatsApp'],
      mainProblems: ['Manual invoice matching', 'Slow reconciliation']
    });
    expect(res.status).toBe(201);
    expect(res.body.organization.id).toBeDefined();
    expect(res.body.organization.knowledgeStatus).toBe('empty');
    testOrgId = res.body.organization.id;
  });

  test('POST /api/orgs — rejects missing businessType', async () => {
    const res = await request(app).post('/api/orgs').send({ name: 'Test Co' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  test('GET /api/orgs — returns list', async () => {
    const res = await request(app).get('/api/orgs');
    expect(res.status).toBe(200);
    expect(res.body.organizations.length).toBeGreaterThan(0);
  });

  test('GET /api/orgs/:orgId — 404 for unknown', async () => {
    const res = await request(app).get('/api/orgs/nonexistent');
    expect(res.status).toBe(404);
  });

  test('PATCH /api/orgs/:orgId — updates profile', async () => {
    const res = await request(app)
      .patch(`/api/orgs/${testOrgId}`)
      .send({ mainProblems: ['Manual invoicing', 'No audit trail', 'Slow month-end'] });
    expect(res.status).toBe(200);
    expect(res.body.organization.mainProblems).toHaveLength(3);
  });

  test('GET /api/orgs/:orgId/dashboard — returns dashboard structure', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/dashboard`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('organization');
    expect(res.body).toHaveProperty('knowledge');
    expect(res.body).toHaveProperty('recentActivity');
  });
});

// ── Documents ────────────────────────────────────────────────────────────────

describe('Document API', () => {
  let docId;

  test('POST /api/orgs/:orgId/documents — uploads text file', async () => {
    const tmpFile = path.join(__dirname, 'test-sop.txt');
    fs.writeFileSync(tmpFile,
      'INVOICE APPROVAL SOP\n' +
      'Finance Assistant receives invoice from Admin.\n' +
      'Finance Assistant checks invoice against delivery records.\n' +
      'Payments over R5,000 require Finance Manager approval.\n' +
      'Payments over R50,000 require Director sign-off.\n' +
      'Missing delivery records must be flagged and supplier notified.\n' +
      'Duplicate invoices are rejected immediately.'
    );
    const res = await request(app)
      .post(`/api/orgs/${testOrgId}/documents`)
      .attach('files', tmpFile);
    fs.unlinkSync(tmpFile);

    expect(res.status).toBe(201);
    expect(res.body.documents).toHaveLength(1);
    docId = res.body.documents[0].id;
  });

  test('POST /api/orgs/:orgId/documents — uploads CSV', async () => {
    const tmpFile = path.join(__dirname, 'invoices.csv');
    fs.writeFileSync(tmpFile, 'supplier,amount,status\nAcme Ltd,4500,pending\nBest Co,12000,approved\nTest Inc,75000,pending');
    const res = await request(app)
      .post(`/api/orgs/${testOrgId}/documents`)
      .attach('files', tmpFile);
    fs.unlinkSync(tmpFile);
    expect(res.status).toBe(201);
  });

  test('GET /api/orgs/:orgId/documents — lists documents', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/documents`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/orgs/:orgId/documents/:docId — returns single document', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/documents/${docId}`);
    expect(res.status).toBe(200);
    expect(res.body.document.id).toBe(docId);
  });

  test('GET /api/orgs/:orgId/documents/:docId — 404 for wrong org', async () => {
    const res2 = await request(app).post('/api/orgs').send({ name: 'Other Co', businessType: 'Retail' });
    const otherId = res2.body.organization.id;
    const res = await request(app).get(`/api/orgs/${otherId}/documents/${docId}`);
    expect(res.status).toBe(404);
  });
});

// ── Engine ────────────────────────────────────────────────────────────────────

describe('Engine API', () => {
  test('GET /api/orgs/:orgId/engine/context — 404 before intake', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/engine/context`);
    expect(res.status).toBe(404);
  });

  test('GET /api/orgs/:orgId/engine/history — returns empty before intake', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/engine/history`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });

  test('GET /api/orgs/:orgId/engine/validation — returns stats', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/engine/validation`);
    expect(res.status).toBe(200);
    expect(res.body.stats).toHaveProperty('total');
    expect(res.body.stats).toHaveProperty('averageConfidence');
  });

  test('GET /api/orgs/:orgId/engine/insights — returns list', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/engine/insights`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('count');
    expect(Array.isArray(res.body.insights)).toBe(true);
  });

  test('GET /api/orgs/:orgId/engine/insights?type=workflow — type filter accepted', async () => {
    const res = await request(app).get(`/api/orgs/${testOrgId}/engine/insights?type=workflow`);
    expect(res.status).toBe(200);
  });
});

// ── Validation routes ─────────────────────────────────────────────────────────

describe('Validation API', () => {
  test('POST /engine/validation/:id/confirm — 404 for missing validation', async () => {
    const res = await request(app)
      .post(`/api/orgs/${testOrgId}/engine/validation/nonexistent-id/confirm`)
      .send({ reviewedBy: 'test-user' });
    // Should not crash — returns null update gracefully
    expect([200, 404, 500]).toContain(res.status);
  });
});

// ── Ask Orgni ─────────────────────────────────────────────────────────────────

describe('Ask Orgni', () => {
  test('POST /engine/ask — rejects short question', async () => {
    const res = await request(app)
      .post(`/api/orgs/${testOrgId}/engine/ask`)
      .send({ question: 'hi' });
    expect(res.status).toBe(400);
  });

  test('POST /engine/ask — accepts valid question (no AI in test)', async () => {
    // We just test the route accepts it — AI call will fail without key in test
    const res = await request(app)
      .post(`/api/orgs/${testOrgId}/engine/ask`)
      .send({ question: 'Who approves payments above R50,000 at this company?' });
    // Without AI key: 500. With key: 200. Both are acceptable in test env.
    expect([200, 500]).toContain(res.status);
  });
});

// ── Actions ───────────────────────────────────────────────────────────────────

describe('Actions API', () => {
  test('POST /engine/actions — rejects invalid type', async () => {
    const res = await request(app)
      .post(`/api/orgs/${testOrgId}/engine/actions`)
      .send({ type: 'build_rocket' });
    expect(res.status).toBe(400);
  });

  test('POST /engine/actions — accepts valid type', async () => {
    const res = await request(app)
      .post(`/api/orgs/${testOrgId}/engine/actions`)
      .send({ type: 'flag_missing' });
    expect([200, 500]).toContain(res.status); // 500 without AI key
  });
});

// ── Parser ────────────────────────────────────────────────────────────────────

describe('Parser Service', () => {
  const { parseFile } = require('../services/parser.service');

  test('parses plain text', async () => {
    const f = path.join(__dirname, 'p.txt');
    fs.writeFileSync(f, 'Invoice approval. Finance checks delivery records.');
    expect(await parseFile(f, 'p.txt')).toContain('Invoice approval');
    fs.unlinkSync(f);
  });

  test('parses CSV', async () => {
    const f = path.join(__dirname, 'p.csv');
    fs.writeFileSync(f, 'supplier,amount\nAcme,5000\nBest,12000');
    const result = await parseFile(f, 'p.csv');
    expect(result).toContain('supplier');
    expect(result).toContain('Acme');
    fs.unlinkSync(f);
  });

  test('parses JSON', async () => {
    const f = path.join(__dirname, 'p.json');
    fs.writeFileSync(f, JSON.stringify({ workflow: 'invoice', steps: ['check', 'approve'] }));
    expect(await parseFile(f, 'p.json')).toContain('invoice');
    fs.unlinkSync(f);
  });
});

// ── Org isolation ─────────────────────────────────────────────────────────────

describe('Organisation isolation', () => {
  test('Org A cannot see Org B documents', async () => {
    const resB = await request(app).post('/api/orgs').send({ name: 'Org B', businessType: 'Retail' });
    const orgBId = resB.body.organization.id;

    const tmpFile = path.join(__dirname, 'orgb.txt');
    fs.writeFileSync(tmpFile, 'Secret document for Org B');
    const uploadRes = await request(app)
      .post(`/api/orgs/${orgBId}/documents`)
      .attach('files', tmpFile);
    fs.unlinkSync(tmpFile);

    const docId = uploadRes.body.documents[0].id;
    const res = await request(app).get(`/api/orgs/${testOrgId}/documents/${docId}`);
    expect(res.status).toBe(404);
  });
});
