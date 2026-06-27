/**
 * src/services/parser.service.js
 *
 * Extracts plain text from uploaded business documents.
 *
 * Supported formats:
 *   .txt, .md    — plain text (UTF-8)
 *   .csv         — converted to labelled row text
 *   .json        — pretty-printed JSON
 *   .pdf         — text extracted via pdf-parse
 *   .docx        — text extracted via mammoth
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
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length === 0) throw new ParserError('CSV file is empty', 'EMPTY_FILE');

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows = lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
    return headers.map((h, i) => `${h}: ${vals[i] || ''}`).join(', ');
  });

  return [
    `CSV Data (${headers.length} columns, ${rows.length} rows)`,
    `Columns: ${headers.join(', ')}`,
    '',
    ...rows.slice(0, 200)
  ].join('\n');
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
  let result;
  try {
    result = await pdfParse(buffer);
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
    result = await mammoth.extractRawText({ buffer });
  } catch (e) {
    throw new ParserError(`DOCX parse failed for "${originalName}": ${e.message}`, 'PARSE_FAILED', '.docx');
  }
  const text = result.value?.trim();
  if (!text) throw new ParserError(`DOCX "${originalName}" contains no extractable text`, 'NO_TEXT', '.docx');
  if (result.messages?.length) {
    logger.warn('DOCX parse warnings', { originalName, messages: result.messages.map(m => m.message) });
  }
  return text;
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
