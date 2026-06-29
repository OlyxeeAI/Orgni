/**
 * src/services/parser.service.js
 *
 * Extracts plain text from uploaded business documents.
 *
 * Supported formats:
 *   .txt, .md    — plain text (UTF-8)
 *   .csv         — converted to labelled row text (RFC4180-aware: quoted fields,
 *                  embedded commas/quotes/newlines, no row cap)
 *   .json        — pretty-printed JSON
 *   .pdf         — text extracted per page via pdf-parse, with [PAGE n] markers
 *   .docx        — HTML extracted via mammoth, converted to structured text that
 *                  preserves headings and lists
 *
 * Unsupported formats are REJECTED — not silently misread.
 *
 * Buffer-based parsing (parseBuffer) is the primary entry point so the engine
 * never needs to touch the filesystem — important for serverless. parseFile is
 * retained as a thin convenience wrapper that reads the file then delegates.
 */

const fs   = require('fs');
const path = require('path');
const logger = require('../db/logger');

const SUPPORTED_EXTENSIONS = new Set(['.txt', '.md', '.csv', '.json', '.pdf', '.docx']);

/**
 * Parse an in-memory buffer and return its plain text content.
 * Throws a structured ParserError on failure.
 */
async function parseBuffer(buffer, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    throw new ParserError(
      `File type "${ext}" is not supported. Supported types: ${[...SUPPORTED_EXTENSIONS].join(', ')}`,
      'UNSUPPORTED_TYPE',
      ext
    );
  }

  try {
    switch (ext) {
      case '.txt':
      case '.md':
        return parsePlainText(buffer);
      case '.csv':
        return parseCSV(buffer);
      case '.json':
        return parseJSON(buffer);
      case '.pdf':
        return parsePDF(buffer, originalName);
      case '.docx':
        return parseDOCX(buffer, originalName);
    }
  } catch (err) {
    if (err instanceof ParserError) throw err;
    logger.error('Parser error', { originalName, error: err.message });
    throw new ParserError(
      `Could not parse "${originalName}": ${err.message}`,
      'PARSE_FAILED',
      ext
    );
  }
}

/**
 * Parse a file from disk. Convenience wrapper around parseBuffer.
 */
async function parseFile(filePath, originalName) {
  const buffer = fs.readFileSync(filePath);
  return parseBuffer(buffer, originalName);
}

function parsePlainText(buffer) {
  const content = buffer.toString('utf-8');
  if (!content.trim()) throw new ParserError('File is empty', 'EMPTY_FILE');
  return content.trim();
}

function parseCSV(buffer) {
  const content = buffer.toString('utf-8');
  if (!content.trim()) throw new ParserError('CSV file is empty', 'EMPTY_FILE');

  const records = parseCSVRecords(content);
  if (records.length === 0) throw new ParserError('CSV file is empty', 'EMPTY_FILE');

  const headers = records[0].map(h => h.trim());
  // Keep every data row — never silently drop rows. Skip only fully blank lines.
  const dataRows = records.slice(1).filter(vals => vals.some(c => c.trim() !== ''));
  const rows = dataRows.map(vals =>
    headers.map((h, i) => `${h}: ${(vals[i] ?? '').trim()}`).join(', ')
  );

  return [
    `CSV Data (${headers.length} columns, ${rows.length} rows)`,
    `Columns: ${headers.join(', ')}`,
    '',
    ...rows
  ].join('\n');
}

/**
 * RFC4180-aware CSV tokenizer. Correctly handles quoted fields containing
 * commas (e.g. "Smith, John"), escaped quotes (""), and newlines inside quotes.
 * Returns an array of records, each an array of string cells.
 */
function parseCSVRecords(text) {
  const records = [];
  let field = '';
  let record = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } // escaped quote
        else { inQuotes = false; }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      record.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++; // CRLF
      record.push(field);
      field = '';
      records.push(record);
      record = [];
    } else {
      field += ch;
    }
  }

  // Flush any trailing field/record not terminated by a newline.
  if (field !== '' || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  // Drop fully empty records (e.g. a trailing newline).
  return records.filter(r => !(r.length === 1 && r[0].trim() === ''));
}

function parseJSON(buffer) {
  const content = buffer.toString('utf-8');
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new ParserError(`Invalid JSON: ${e.message}`, 'INVALID_JSON');
  }
  return `JSON Document:\n${JSON.stringify(parsed, null, 2)}`;
}

async function parsePDF(buffer, originalName) {
  const pdfParse = require('pdf-parse/lib/pdf-parse.js');

  // Custom page renderer so we can keep page boundaries and inject [PAGE n]
  // markers instead of collapsing every page into one undifferentiated string.
  let pageNum = 0;
  const renderPage = (pageData) =>
    pageData
      .getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false })
      .then((textContent) => {
        pageNum += 1;
        let lastY;
        let pageText = '';
        for (const item of textContent.items) {
          if (lastY === item.transform[5] || lastY === undefined) {
            pageText += item.str;
          } else {
            pageText += '\n' + item.str;
          }
          lastY = item.transform[5];
        }
        return `\n\n[PAGE ${pageNum}]\n${pageText.trim()}`;
      });

  let result;
  try {
    result = await pdfParse(buffer, { pagerender: renderPage });
  } catch (e) {
    throw new ParserError(`PDF parse failed for "${originalName}": ${e.message}`, 'PARSE_FAILED', '.pdf');
  }

  const text = result.text?.trim();
  if (!text) throw new ParserError(`PDF "${originalName}" contains no extractable text (may be scanned image)`, 'NO_TEXT', '.pdf');
  return text;
}

async function parseDOCX(buffer, originalName) {
  const mammoth = require('mammoth');
  let result;
  try {
    // convertToHtml preserves heading levels, lists, and tables — extractRawText
    // throws all of that structure away before we ever see it.
    result = await mammoth.convertToHtml({ buffer });
  } catch (e) {
    throw new ParserError(`DOCX parse failed for "${originalName}": ${e.message}`, 'PARSE_FAILED', '.docx');
  }

  const text = htmlToStructuredText(result.value || '').trim();
  if (!text) throw new ParserError(`DOCX "${originalName}" contains no extractable text`, 'NO_TEXT', '.docx');
  if (result.messages?.length) {
    logger.warn('DOCX parse warnings', { originalName, messages: result.messages.map(m => m.message) });
  }
  return text;
}

/**
 * Convert mammoth's HTML output to structured plain text. Headings become
 * markdown-style headers and list items become bullets so the section
 * structure survives into the extractor instead of being flattened away.
 */
function htmlToStructuredText(html) {
  let out = html;

  // Headings -> markdown headers (preserve section structure).
  out = out.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, inner) =>
    `\n\n${'#'.repeat(Number(level))} ${stripTags(inner).trim()}\n`
  );

  // List items -> bullets.
  out = out.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, inner) => `\n- ${stripTags(inner).trim()}`);

  // Table cells -> tab separated, rows -> newlines.
  out = out.replace(/<\/(td|th)>/gi, '\t');
  out = out.replace(/<\/tr>/gi, '\n');

  // Block-level boundaries -> newlines.
  out = out.replace(/<br\s*\/?>/gi, '\n');
  out = out.replace(/<\/(p|div)>/gi, '\n');

  // Strip any remaining tags and decode entities.
  out = stripTags(out);
  out = decodeEntities(out);

  // Tidy whitespace.
  out = out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  return out;
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '');
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

class ParserError extends Error {
  constructor(message, code = 'PARSE_FAILED', ext = null) {
    super(message);
    this.name = 'ParserError';
    this.code = code;
    this.ext = ext;
  }
}

module.exports = { parseFile, parseBuffer, ParserError, SUPPORTED_EXTENSIONS };
