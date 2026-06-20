/**
 * ai.service.js
 * Single interface for all LLM calls.
 * Provider is configured via environment — swap Anthropic → Grok → OpenAI
 * by changing PROVIDER, AI_BASE_URL, and AI_MODEL env vars.
 */

const https = require('https');
const http = require('http');
const logger = require('../db/logger');

const PROVIDER = process.env.AI_PROVIDER || 'anthropic';
const MODEL = process.env.AI_MODEL || 'claude-sonnet-4-6';
const API_KEY = process.env.AI_API_KEY || process.env.ANTHROPIC_API_KEY || '';
const BASE_URL = process.env.AI_BASE_URL || 'https://api.anthropic.com';

/**
 * Call the configured AI provider and return text.
 */
async function complete(prompt, options = {}) {
  const maxTokens = options.maxTokens || 3000;

  if (PROVIDER === 'anthropic') {
    return callAnthropic(prompt, maxTokens);
  } else {
    // OpenAI-compatible (Grok, OpenAI, local Ollama, etc.)
    return callOpenAICompat(prompt, maxTokens);
  }
}

/**
 * Complete and parse JSON response.
 */
async function completeJSON(prompt, options = {}) {
  const text = await complete(prompt, options);
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (e) {
    logger.error('AI JSON parse failed', { error: e.message, raw: text.slice(0, 200) });
    throw new Error(`AI returned invalid JSON: ${e.message}`);
  }
}

function callAnthropic(prompt, maxTokens) {
  return makeRequest({
    url: `${BASE_URL}/v1/messages`,
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      ...(API_KEY && { 'x-api-key': API_KEY })
    },
    body: {
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    },
    extractText: (data) => data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || ''
  });
}

function callOpenAICompat(prompt, maxTokens) {
  return makeRequest({
    url: `${BASE_URL}/v1/chat/completions`,
    headers: {
      'Content-Type': 'application/json',
      ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
    },
    body: {
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    },
    extractText: (data) => data.choices?.[0]?.message?.content || ''
  });
}

function makeRequest({ url, headers, body, extractText }) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const transport = isHttps ? https : http;

    const req = transport.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            return reject(new Error(parsed.error.message || JSON.stringify(parsed.error)));
          }
          const text = extractText(parsed);
          resolve(text);
        } catch (e) {
          reject(new Error(`Response parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('AI request timeout'));
    });
    req.write(bodyStr);
    req.end();
  });
}

module.exports = { complete, completeJSON };
