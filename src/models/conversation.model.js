/**
 * conversation.model.js
 * Ask Orgni Q&A — stores questions, answers, and source citations.
 */
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const C = 'conversations';

async function create(data) {
  const record = {
    id: uuidv4(),
    orgId: data.orgId,
    question: data.question,
    answer: data.answer,
    grounded: data.grounded,          // true if answer is based on actual data
    sources: data.sources || [],      // [{documentId, documentName, excerpt}]
    askedAt: new Date().toISOString()
  };
  return db.insert(C, record);
}

async function findByOrg(orgId, limit = 20) {
  return db.findMany(C, { orgId }, { sortBy: 'askedAt', sortDir: 'desc', limit });
}

module.exports = { create, findByOrg };
