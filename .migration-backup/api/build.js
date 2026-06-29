/**
 * api/build.js — Vercel serverless function.
 *
 * The ONE part of Orgni that needs AI: it turns the business profile + uploaded
 * source text into a structured operating-model "context" object. It runs only
 * on a Vercel deployment (the frontend calls it from its on-device data layer).
 * The AI key stays here as a server-side env var and is never sent to the
 * browser. No database is touched — the built map is returned to the caller,
 * which persists it in the browser.
 *
 * Env vars (set in the Vercel project, kept secret):
 *   AI_API_KEY      (or ANTHROPIC_API_KEY)   — required
 *   AI_PROVIDER     anthropic | openai        — default: anthropic
 *   AI_MODEL        model id                   — default: claude-sonnet-4-5
 *   AI_BASE_URL     override API base url       — optional
 */

const https = require('https');
const http = require('http');

const TIMEOUT_MS = 60000;
const CORPUS_CHARS = 120000;

function getConfig() {
  return {
    provider: process.env.AI_PROVIDER || 'anthropic',
    model: process.env.AI_MODEL || 'claude-sonnet-4-5',
    apiKey: process.env.AI_API_KEY || process.env.ANTHROPIC_API_KEY || '',
    baseUrl: process.env.AI_BASE_URL || 'https://api.anthropic.com'
  };
}

function buildCorpus(org = {}, documents = []) {
  const profile = [
    '[SOURCE: organization_profile]',
    `Company: ${org.name || ''}`,
    `Type: ${org.businessType || ''}`,
    `Departments: ${(org.departments || []).join(', ') || 'not specified'}`,
    `Key Workflows: ${(org.keyWorkflows || []).join(', ') || 'not specified'}`,
    `Current Tools: ${(org.currentTools || []).join(', ') || 'not specified'}`,
    `Main Problems: ${(org.mainProblems || []).join(', ') || 'not specified'}`,
    '[END SOURCE: organization_profile]'
  ].join('\n');

  let corpus = profile;
  for (const doc of documents) {
    const text = (doc && doc.text ? String(doc.text) : '').trim();
    if (!text) continue;
    const block = `\n\n[SOURCE: ${doc.name || 'document'}]\n${text}\n[END SOURCE: ${doc.name || 'document'}]`;
    if (corpus.length + block.length > CORPUS_CHARS) break;
    corpus += block;
  }
  return corpus;
}

const PROMPT_SCHEMA = `Return ONLY valid JSON (no prose, no markdown fences) with this exact shape:
{
  "summary": {
    "business_name": "",
    "business_type": "",
    "plain_english_summary": "2-3 sentence summary of how this business operates",
    "core_function": "",
    "confidence": 0.0,
    "missing_information": ["what is unclear or not covered by the sources"]
  },
  "confidence": 0.0,
  "riskScore": 0.0,
  "departments": [{ "name": "", "functions": [""] }],
  "roles": [{ "role": "", "department": "", "tasks": [""], "depends_on": [""] }],
  "workflows": [{ "workflow_name": "", "trigger": "", "steps": [""], "owner": "", "bottlenecks": [{ "bottleneck": "", "impact": "", "recommendation": "" }] }],
  "rules": [{ "rule_name": "", "condition": "", "action": "", "department": "" }],
  "approvals": [{ "approval": "", "threshold": "", "approver": "" }],
  "exceptions": [{ "exception": "", "handling": "" }],
  "risks": [{ "risk": "", "severity": "low|medium|high", "reason": "", "recommendation": "", "affected_workflow": "" }],
  "bottlenecks": [{ "bottleneck": "", "affected_workflow": "", "impact": "", "recommendation": "" }],
  "gaps": [{ "gap": "", "recommendation": "" }],
  "dependencies": [{ "from": "", "to": "", "type": "" }],
  "aiOpportunities": [{ "opportunity": "", "value": "", "risk_level": "low|medium|high", "workflow": "" }],
  "readiness": [{ "workflow": "", "readiness_score": 0 }],
  "blueprint": {},
  "missingInformation": ["short strings"],
  "recommendedNextSteps": ["short actionable strings"]
}
Rules: Only include items directly supported by the source text. Use [] for empty arrays. "confidence" and "riskScore" are 0.0-1.0. Keep it grounded — do not invent facts the sources do not state.`;

function buildPrompt(corpus, businessName) {
  return `You are Orgni Engine, the operations-intelligence system. Read the business information below and extract a complete operating model for "${businessName}": its departments, roles, workflows, rules, approvals, exceptions, risks, bottlenecks, gaps, dependencies, AI opportunities and a plain-English summary.

${PROMPT_SCHEMA}

BUSINESS INFORMATION:
${corpus}`;
}

function callAI(cfg, prompt) {
  const isAnthropic = cfg.provider === 'anthropic';
  const url = isAnthropic ? `${cfg.baseUrl}/v1/messages` : `${cfg.baseUrl}/v1/chat/completions`;
  const headers = isAnthropic
    ? { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': cfg.apiKey }
    : { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` };
  const body = isAnthropic
    ? { model: cfg.model, max_tokens: 8000, messages: [{ role: 'user', content: prompt }] }
    : { model: cfg.model, max_tokens: 8000, messages: [{ role: 'user', content: prompt }] };
  const extractText = isAnthropic
    ? (d) => (d.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')
    : (d) => (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '';

  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const parsed = new URL(url);
    const transport = parsed.protocol === 'https:' ? https : http;
    const req = transport.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + (parsed.search || ''),
        method: 'POST',
        headers: { ...headers, 'Content-Length': Buffer.byteLength(bodyStr) }
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              const msg = json.error.message || JSON.stringify(json.error);
              return reject(new Error(res.statusCode === 401 ? `Authentication failed: ${msg}` : msg));
            }
            resolve(extractText(json));
          } catch (e) {
            reject(new Error(`AI response parse error (HTTP ${res.statusCode}): ${e.message}`));
          }
        });
      }
    );
    req.on('error', (e) => reject(new Error(`Network error: ${e.message}`)));
    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy();
      reject(new Error('AI request timed out after 60s'));
    });
    req.write(bodyStr);
    req.end();
  });
}

function parseJson(text) {
  let clean = String(text).replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  try { return JSON.parse(clean); } catch (_) {}
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch (_) {}
  }
  throw new Error('AI returned unparseable JSON.');
}

function toContext(orgId, data) {
  const summary = data.summary || {};
  return {
    orgId,
    generatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    confidence: typeof data.confidence === 'number' ? data.confidence : summary.confidence || 0,
    riskScore: typeof data.riskScore === 'number' ? data.riskScore : 0,
    validationStats: {},
    summary,
    departments: data.departments || [],
    roles: data.roles || [],
    workflows: data.workflows || [],
    rules: data.rules || [],
    approvals: data.approvals || [],
    exceptions: data.exceptions || [],
    dependencies: data.dependencies || [],
    risks: data.risks || [],
    bottlenecks: data.bottlenecks || [],
    gaps: data.gaps || [],
    missingInformation: data.missingInformation || summary.missing_information || [],
    aiOpportunities: data.aiOpportunities || [],
    readiness: data.readiness || [],
    blueprint: data.blueprint || {},
    recommendedNextSteps: data.recommendedNextSteps || [],
    sourceDocuments: (data.sourceDocuments || []).map((d) => ({ id: d.id, name: d.name }))
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const cfg = getConfig();
  if (!cfg.apiKey) {
    res.status(400).json({
      error: 'AI is not configured. Set AI_API_KEY (an Anthropic API key) in your Vercel project settings to build the operating model.'
    });
    return;
  }

  let payload = req.body;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch { payload = {}; }
  }
  payload = payload || {};
  const org = payload.org || {};
  const documents = Array.isArray(payload.documents) ? payload.documents : [];
  const orgId = org.id || payload.orgId || 'local';

  try {
    const corpus = buildCorpus(org, documents);
    const text = await callAI(cfg, buildPrompt(corpus, org.name || 'this business'));
    const data = parseJson(text);
    const context = toContext(orgId, data);
    context.sourceDocuments = documents.map((d) => ({ id: d.id, name: d.name }));
    res.status(200).json({ context });
  } catch (err) {
    res.status(502).json({ error: err.message || 'Failed to build the operating model.' });
  }
};
