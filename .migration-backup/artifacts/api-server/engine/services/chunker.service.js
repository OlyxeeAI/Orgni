/**
 * src/services/chunker.service.js
 *
 * Splits parsed document text into retrievable chunks while preserving the
 * provenance markers the parsers emit:
 *   - PDF  -> `[PAGE n]` lines (parser.service.parsePDF)
 *   - DOCX -> markdown `#`..`######` headings (parser.service.htmlToStructuredText)
 *
 * Each chunk records the page it started on and the section heading it falls
 * under, so a finding can later be traced back to "page 14, §Refund Policy"
 * instead of an undifferentiated blob.
 *
 * Chunking is purely structural (paragraph + heading boundaries) and
 * deterministic — no embeddings, no network. Relevance is handled later by the
 * retrieval service.
 */

const DEFAULT_TARGET_CHARS = Number(process.env.ORGNI_CHUNK_CHARS || 1500);

const PAGE_RE    = /^\s*\[PAGE (\d+)\]\s*$/;
const HEADING_RE = /^\s*(#{1,6})\s+(.*\S)\s*$/;

/**
 * @param {string} text
 * @param {{ targetChars?: number }} [opts]
 * @returns {Array<{ index: number, text: string, page: number|null, section: string|null }>}
 */
function chunkText(text, opts = {}) {
  const targetChars = opts.targetChars || DEFAULT_TARGET_CHARS;
  const hardLimit   = Math.floor(targetChars * 1.6);
  const lines = String(text || '').split('\n');

  const chunks = [];
  let buf = [];
  let bufLen = 0;

  let page = null;          // running page from the latest [PAGE n] marker
  let section = null;       // running section from the latest heading
  let chunkPage = null;     // page at the start of the current buffer
  let chunkSection = null;  // section at the start of the current buffer

  const flush = () => {
    const t = buf.join('\n').trim();
    if (t) chunks.push({ index: chunks.length, text: t, page: chunkPage, section: chunkSection });
    buf = [];
    bufLen = 0;
  };

  for (const line of lines) {
    const pageMatch = line.match(PAGE_RE);
    if (pageMatch) {
      const next = Number(pageMatch[1]);
      // Flush at a page boundary so a chunk never spans two pages while keeping
      // only its start page — this keeps page-level provenance accurate.
      if (bufLen > 0 && next !== page) flush();
      page = next;
      if (bufLen === 0) chunkPage = page; // marker drops; don't keep its text
      continue;
    }

    const headingMatch = line.match(HEADING_RE);
    if (headingMatch) {
      // A heading begins a new logical section — start a fresh chunk so each
      // chunk is anchored to a single section.
      if (bufLen > 0) flush();
      section = headingMatch[2].trim();
      chunkPage = page;
      chunkSection = section;
      buf.push(line);
      bufLen += line.length + 1;
      continue;
    }

    if (bufLen === 0) { chunkPage = page; chunkSection = section; }
    buf.push(line);
    bufLen += line.length + 1;

    // Prefer to break on a blank line once we're past target size; otherwise
    // force a break before a single chunk grows unbounded.
    if (bufLen >= targetChars && line.trim() === '') flush();
    else if (bufLen >= hardLimit) flush();
  }

  flush();
  return chunks;
}

module.exports = { chunkText, DEFAULT_TARGET_CHARS };
