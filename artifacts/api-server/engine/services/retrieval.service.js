/**
 * src/services/retrieval.service.js
 *
 * Relevance-based retrieval over document chunks. Replaces the old "first N
 * characters of each document" corpus assembly that silently dropped anything
 * past a fixed offset.
 *
 * Scoring is deterministic keyword overlap (no embeddings / no network) — the
 * same lightweight approach the deterministic extractor already uses, so the
 * engine behaves identically with or without an AI provider configured.
 */

const chunkModel = require('../models/chunk.model');
const chunker    = require('./chunker.service');
const logger     = require('../db/logger');

const STOP = new Set([
  'what', 'which', 'where', 'when', 'who', 'whom', 'whose', 'why', 'how',
  'does', 'did', 'the', 'and', 'for', 'this', 'that', 'with', 'from', 'about',
  'into', 'above', 'are', 'was', 'were', 'has', 'have', 'had', 'our', 'your',
  'their', 'its', 'can', 'will', 'would', 'should', 'could', 'you', 'they'
]);

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter(t => t.length > 2 && !STOP.has(t)) || [];
}

function scoreText(text, terms) {
  if (!terms.length) return 0;
  const lower = String(text || '').toLowerCase();
  return terms.reduce((s, t) => s + (lower.includes(t) ? 1 : 0), 0);
}

/**
 * Return every chunk for an org's parsed documents. Uses stored chunks when
 * present, and falls back to chunking a document's content in-memory if it was
 * uploaded before chunking existed (so legacy data needs no migration).
 */
async function getOrgChunks(orgId, documents = []) {
  const parsed = documents.filter(d => d.status === 'parsed' && d.content);

  let stored = [];
  try {
    stored = await chunkModel.findByOrg(orgId);
  } catch (e) {
    logger.warn('Chunk lookup failed, falling back to in-memory chunking', { orgId, error: e.message });
  }

  const byDoc = new Map();
  for (const c of stored) {
    if (!byDoc.has(c.documentId)) byDoc.set(c.documentId, []);
    byDoc.get(c.documentId).push(c);
  }

  const result = [];
  for (const d of parsed) {
    const existing = byDoc.get(d.id);
    if (existing && existing.length) {
      existing.sort((a, b) => a.index - b.index).forEach(c => result.push(c));
    } else {
      chunker.chunkText(d.content).forEach(c => result.push({
        ...c,
        orgId,
        documentId: d.id,
        documentName: d.originalName || d.name,
        charCount: c.text.length
      }));
    }
  }
  return result;
}

/**
 * Pick the chunks most relevant to `query`, bounded by a char budget and a max
 * count. When nothing matches (or no query), fall back to leading chunks so the
 * caller always has source material to work with.
 */
function retrieve(query, chunks, opts = {}) {
  const maxChars  = opts.maxChars  || 12000;
  const maxChunks = opts.maxChunks || 8;
  const terms = tokenize(query);

  const ranked = chunks
    .map(c => ({ chunk: c, score: scoreText(c.text, terms) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);

  const ordered = ranked.length ? ranked.map(r => r.chunk) : chunks.slice();

  const picked = [];
  let total = 0;
  for (const c of ordered) {
    if (picked.length >= maxChunks) break;
    if (picked.length > 0 && total + c.text.length > maxChars) continue;
    picked.push(c);
    total += c.text.length;
  }
  return picked;
}

/**
 * Render chunks for an LLM prompt. Each document gets a short stable id (D1,
 * D2…) the model can cite, and each chunk is tagged with its page/section so the
 * model can ground answers in a specific location. Returns the corpus string
 * plus a docMap (Dn -> { id, name, pages }) for resolving citations back to
 * real documents with provenance.
 */
function buildPromptCorpus(chunks) {
  const ids = new Map();      // documentId -> Dn
  const docMap = new Map();   // Dn -> { id, name, pages:Set }
  const parts = [];

  for (const c of chunks) {
    if (!ids.has(c.documentId)) {
      const sid = `D${ids.size + 1}`;
      ids.set(c.documentId, sid);
      docMap.set(sid, { id: c.documentId, name: c.documentName, pages: new Set() });
    }
    const sid = ids.get(c.documentId);
    if (c.page != null) docMap.get(sid).pages.add(c.page);

    const loc = [
      c.page != null ? `p.${c.page}` : null,
      c.section ? `§${c.section}` : null
    ].filter(Boolean).join(' ');

    parts.push(`<<DOC ${sid}${loc ? ` | ${loc}` : ''} | ${c.documentName}>>\n${c.text}\n<<END ${sid}>>`);
  }

  // Freeze pages Sets into sorted arrays for easy consumption downstream.
  const resolvedDocMap = new Map();
  for (const [sid, meta] of docMap) {
    resolvedDocMap.set(sid, { id: meta.id, name: meta.name, pages: [...meta.pages].sort((a, b) => a - b) });
  }

  return { corpus: parts.join('\n\n'), docMap: resolvedDocMap };
}

module.exports = { getOrgChunks, retrieve, buildPromptCorpus, tokenize, scoreText };
