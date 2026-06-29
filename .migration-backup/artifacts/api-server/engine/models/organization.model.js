const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const C = 'organizations';

async function create(data) {
  const record = {
    id: uuidv4(),
    name: data.name,
    businessType: data.businessType,
    departments: data.departments || [],
    roles: data.roles || [],
    keyWorkflows: data.keyWorkflows || [],
    currentTools: data.currentTools || [],
    mainProblems: data.mainProblems || [],
    status: 'active',
    knowledgeStatus: 'empty',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  return db.insert(C, record);
}

async function findById(id)       { return db.findById(C, id); }
async function findAll()          { return db.findMany(C); }
async function update(id, data)   { return db.update(C, id, data); }
async function remove(id)         { return db.delete(C, id); }

module.exports = { create, findById, findAll, update, remove };
