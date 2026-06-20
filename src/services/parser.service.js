/**
 * parser.service.js
 * Extracts plain text from uploaded files.
 * Supports: .txt, .md, .csv, .json
 * Extensible: add pdf-parse and mammoth when native deps are available.
 */

const fs = require('fs');
const path = require('path');
const logger = require('../db/logger');

/**
 * Parse a file and return plain text content.
 */
async function parseFile(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  try {
    switch (ext) {
      case '.txt':
      case '.md':
        return parsePlainText(filePath);

      case '.csv':
        return parseCSV(filePath);

      case '.json':
        return parseJSON(filePath);

      default:
        // For unsupported types, try reading as plain text
        logger.warn(`Unsupported file type ${ext}, attempting plain text read`, { filePath });
        return parsePlainText(filePath);
    }
  } catch (err) {
    logger.error('File parse error', { filePath, originalName, error: err.message });
    throw new Error(`Could not parse file "${originalName}": ${err.message}`);
  }
}

function parsePlainText(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.trim();
}

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  // Convert CSV to readable text representation
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length === 0) return '';

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows = lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
    return headers.map((h, i) => `${h}: ${vals[i] || ''}`).join(', ');
  });

  return `CSV Data (${headers.length} columns, ${rows.length} rows):\nColumns: ${headers.join(', ')}\n\n${rows.slice(0, 100).join('\n')}`;
}

function parseJSON(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(content);
  return `JSON Document:\n${JSON.stringify(parsed, null, 2)}`;
}

module.exports = { parseFile };
