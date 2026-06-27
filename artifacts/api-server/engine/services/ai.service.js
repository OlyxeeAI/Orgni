/**
 * src/services/ai.service.js
 *
 * Single interface for all LLM calls. Provider-swappable via env vars.
 *
 * Config is read at CALL TIME (not module load) so tests can set env vars
 * before the first call without module-level caching issues.
 *
 * Features:
 *   - Anthropic and OpenAI-compatible (Grok, OpenAI) providers
 *   - Retry logic with exponential backoff for transient failures
 *   - Timeout handling (60s default)
 *   - Clear errors when API key is missing
 *   - JSON schema validation and best-effort repair
 *   - Structured error type (AIError) for clean upstream handling
 *   - AI calls are no-oped in NODE_ENV=test unless AI_ENABLED=true
 */

const https  = require('https');
const http   = require('http');
const logger = require('../db/logger');

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;
const TIMEOUT_MS     = 60000;

class AIError extends Error {
  constructor(message, code = 'AI_ERROR') {
    super(message);
    this.name  = 'AIError';
    this.code  = code;
  }
}

function getConfig() {
  return {
    provider: process.env.AI_PROVIDER || 'anthropic',
    model:    process.env.AI_MODEL    || 'claude-sonnet-4-6',
    apiKey:   process.env.AI_API_KEY  || process.env.ANTHROPIC_API_KEY || process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || '',
    baseUrl:  process.env.AI_BASE_URL || process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL || 'https://api.anthropic.com'
  };
}

/**
 * Test stub — returns predictable, realistic-looking JSON so:
 *   1. `npm test` never needs a real API key
 *   2. Anyone inspecting the response shape locally sees a believable
 *      knowledge map instead of an all-empty object, without needing
 *      a real AI provider configured.
 *
 * The stub inspects the prompt to return shape-appropriate sample data —
 * a workflow-extraction prompt gets sample workflows, a risk-extraction
 * prompt gets sample risks, etc. This is NOT real extraction — it is a
 * fixed example so local development and tests have something concrete
 * to look at without requiring AI_API_KEY.
 */
function testStub(prompt) {
  const p = prompt.toLowerCase();

  // Order matters: check the more specific/unique markers first to avoid
  // collisions where multiple prompts share a field name (e.g. both the
  // workflow and opportunity/blueprint extractors mention "workflow_name").
  if (p.includes('"estimated_time_saving"')) {
    return JSON.stringify({
      opportunities: [{
        opportunity: 'Auto-match invoices to delivery records', workflow: 'Invoice Approval',
        value: 'Reduces manual checking time', risk_level: 'low',
        required_data: ['Invoice records', 'Delivery records'],
        requires_human_approval: true, suggested_first: true,
        estimated_time_saving: '2-3 hours/week', _confidence: 0.7
      }],
      readiness: [{
        workflow: 'Invoice Approval', readiness_score: 65,
        reason: 'Clear rules exist but matching is manual',
        blockers: ['No system integration'], required_integrations: ['Accounting system']
      }],
      blueprint: { blueprints: [{
        workflow_name: 'Invoice Approval', trigger: 'Invoice received',
        steps: [
          { step: 'Extract invoice data', actor: 'AI', requires_approval: false, risk_level: 'low' },
          { step: 'Approve payment', actor: 'Human', requires_approval: true, risk_level: 'medium' }
        ],
        ai_boundaries: ['AI cannot approve payments'],
        human_approval_points: ['Payments over R5,000'],
        integration_requirements: ['Accounting system']
      }] },
      recommended_first_workflow: 'Invoice Approval',
      reason: 'Highest volume, clearest rules'
    });
  }

  if (p.includes('"workflow_name"')) {
    return JSON.stringify({
      workflows: [{
        workflow_name: 'Invoice Approval',
        trigger: 'Supplier invoice received',
        steps: ['Check invoice against delivery records', 'Route for approval based on amount'],
        owner: 'Finance Assistant',
        required_documents: ['Invoice', 'Delivery record'],
        decision_points: ['Does invoice match delivery record?'],
        approval_points: ['Finance Manager approval over R5,000'],
        risks: [], bottlenecks: [],
        ai_assistance_possible: ['Auto-match invoice to delivery record'],
        _sourceDocName: 'sample document', _confidence: 0.8, _supported: true
      }],
      missing_information: []
    });
  }

  if (p.includes('"decision_authority"')) {
    return JSON.stringify({
      departments: [{ name: 'Finance', functions: ['Invoice processing', 'Approvals'] }],
      roles: [{
        role: 'Finance Manager', department: 'Finance',
        tasks: ['Approve invoices over R5,000'],
        decision_authority: ['Payment approval'], approval_authority: ['Up to R50,000'],
        depends_on: ['Finance Assistant'], unclear_responsibilities: [],
        _sourceDocName: 'sample document', _confidence: 0.8
      }]
    });
  }

  if (p.includes('"rule_name"')) {
    return JSON.stringify({
      rules: [{
        rule_name: 'High-value payment approval', condition: 'amount > 5000',
        action: 'require_manager_approval', risk_level: 'medium', department: 'Finance',
        ai_allowed: false, requires_human_approval: true,
        _sourceDocName: 'sample document', _sourceExcerpt: 'Payments over R5,000 require approval',
        _confidence: 0.85, source: 'Payments over R5,000 require approval'
      }],
      approvals: [], exceptions: [], ai_boundaries: ['AI cannot approve payments']
    });
  }

  if (p.includes('"overall_risk_score"')) {
    return JSON.stringify({
      risks: [{
        risk: 'Manual invoice matching may miss discrepancies', severity: 'medium',
        reason: 'Process relies on manual checking', affected_workflow: 'Invoice Approval',
        recommendation: 'Automate invoice-to-delivery matching', _confidence: 0.75
      }],
      bottlenecks: [], gaps: [{
        gap: 'No documented escalation path for disputes', type: 'process',
        affected_workflow: 'Invoice Approval', recommendation: 'Document a dispute process'
      }],
      dependencies: [], overall_risk_score: 0.35,
      overall_risk_reason: 'Some manual processes, but core controls are in place'
    });
  }

  if (p.includes('plain_english_summary')) {
    return JSON.stringify({
      business_name: 'Sample Business', business_type: 'Logistics',
      plain_english_summary: 'A logistics company that processes supplier invoices with manual approval steps based on payment amount.',
      core_function: 'Freight logistics', key_operational_facts: ['Invoice approval is tiered by amount'],
      systems_in_use: ['Email'], document_types_in_use: ['Invoices', 'Delivery records'],
      confidence: 0.75, confidence_reason: 'Based on uploaded SOP document',
      missing_information: ['What accounting system is used?']
    });
  }

  // Ask Orgni / generic completion fallback
  return JSON.stringify({
    question: '', answer: 'This is a stubbed answer used in test/dev mode. Configure AI_API_KEY to get real answers.',
    grounded: true, sources: []
  });
}

/**
 * Whether a real AI provider is usable right now. Lets callers degrade
 * gracefully (e.g. a deterministic fallback) instead of throwing when no key
 * is configured — important on hosts like Vercel where the key is optional.
 */
function isConfigured() {
  if (process.env.NODE_ENV === 'test' && process.env.AI_ENABLED !== 'true') return true;
  return Boolean(getConfig().apiKey);
}

/**
 * Call AI and return raw text.
 */
async function complete(prompt, options = {}) {
  if (process.env.NODE_ENV === 'test' && process.env.AI_ENABLED !== 'true') {
    return testStub(prompt);
  }

  const cfg = getConfig();
  if (!cfg.apiKey) {
    throw new AIError(
      'AI_API_KEY is not set. Set AI_API_KEY (or ANTHROPIC_API_KEY) in your environment.',
      'MISSING_API_KEY'
    );
  }

  const maxTokens = options.maxTokens || 3000;
  const attempt   = options._attempt || 1;

  try {
    if (cfg.provider === 'anthropic') {
      return await callAnthropic(cfg, prompt, maxTokens);
    } else {
      return await callOpenAICompat(cfg, prompt, maxTokens);
    }
  } catch (err) {
    const retryable = isRetryable(err);
    if (retryable && attempt < RETRY_ATTEMPTS) {
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      logger.warn('AI call failed, retrying', { attempt, delay, error: err.message });
      await sleep(delay);
      return complete(prompt, { ...options, _attempt: attempt + 1 });
    }
    throw err instanceof AIError ? err : new AIError(err.message);
  }
}

/**
 * Call AI and return a parsed JSON object.
 * Attempts to repair common JSON issues before failing.
 */
async function completeJSON(prompt, options = {}) {
  const text = await complete(prompt, options);
  return parseAIJson(text);
}

function parseAIJson(text) {
  // Strip markdown fences
  let clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  // Try direct parse
  try { return JSON.parse(clean); } catch (_) {}

  // Try extracting first {...} block
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch (_) {}
  }

  // Try extracting first [...] block
  const arrMatch = clean.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try { return JSON.parse(arrMatch[0]); } catch (_) {}
  }

  logger.error('AI JSON parse failed after repair attempts', { raw: text.slice(0, 300) });
  throw new AIError(`AI returned unparseable JSON. Raw: ${text.slice(0, 200)}`, 'INVALID_JSON');
}

function callAnthropic(cfg, prompt, maxTokens) {
  return makeRequest({
    url:     `${cfg.baseUrl}/v1/messages`,
    headers: {
      'Content-Type':      'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key':         cfg.apiKey
    },
    body: {
      model:      cfg.model,
      max_tokens: maxTokens,
      messages:   [{ role: 'user', content: prompt }]
    },
    extractText: d => d.content?.filter(b => b.type === 'text').map(b => b.text).join('') || ''
  });
}

function callOpenAICompat(cfg, prompt, maxTokens) {
  return makeRequest({
    url:     `${cfg.baseUrl}/v1/chat/completions`,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${cfg.apiKey}`
    },
    body: {
      model:      cfg.model,
      max_tokens: maxTokens,
      messages:   [{ role: 'user', content: prompt }]
    },
    extractText: d => d.choices?.[0]?.message?.content || ''
  });
}

function makeRequest({ url, headers, body, extractText }) {
  return new Promise((resolve, reject) => {
    const bodyStr   = JSON.stringify(body);
    const parsedUrl = new URL(url);
    const isHttps   = parsedUrl.protocol === 'https:';
    const transport = isHttps ? https : http;

    const req = transport.request({
      hostname: parsedUrl.hostname,
      port:     parsedUrl.port || (isHttps ? 443 : 80),
      path:     parsedUrl.pathname + (parsedUrl.search || ''),
      method:   'POST',
      headers:  { ...headers, 'Content-Length': Buffer.byteLength(bodyStr) }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            const msg = parsed.error.message || JSON.stringify(parsed.error);
            // Anthropic 401 = bad key, 429 = rate limit
            if (res.statusCode === 401) return reject(new AIError(`Authentication failed: ${msg}`, 'AUTH_ERROR'));
            if (res.statusCode === 429) return reject(new AIError(`Rate limited: ${msg}`, 'RATE_LIMITED'));
            return reject(new AIError(msg));
          }
          resolve(extractText(parsed));
        } catch (e) {
          reject(new AIError(`Response parse error (HTTP ${res.statusCode}): ${e.message}`));
        }
      });
    });

    req.on('error', e => reject(new AIError(`Network error: ${e.message}`, 'NETWORK_ERROR')));
    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy();
      reject(new AIError('AI request timed out after 60s', 'TIMEOUT'));
    });

    req.write(bodyStr);
    req.end();
  });
}

function isRetryable(err) {
  if (!(err instanceof AIError)) return true; // unknown errors are retried
  return ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMITED'].includes(err.code);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { complete, completeJSON, isConfigured, AIError, parseAIJson };
