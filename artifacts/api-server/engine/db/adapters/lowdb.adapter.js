/**
 * src/db/adapters/lowdb.adapter.js
 *
 * Prototype storage using lowdb (JSON file).
 * Implements RepositoryInterface exactly.
 *
 * SWAP GUIDE — to move to PostgreSQL:
 *   Replace this file with postgres.adapter.js
 *   Implement the same 7 methods using pg or Prisma
 *   Change src/db/index.js to import postgres.adapter.js
 *   Nothing else changes.
 *
 * SWAP GUIDE — to move to Supabase:
 *   Replace with supabase.adapter.js
 *   Use @supabase/supabase-js client
 *   Map insert→.from().insert(), findMany→.from().select().match() etc.
 */

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const fs = require('fs');
const RepositoryInterface = require('../repository.interface');

class LowdbAdapter extends RepositoryInterface {
  constructor() {
    super();
    const dbPath = process.env.DB_PATH || path.join(__dirname, '../../../data/db.json');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });

    const adapter = new FileSync(dbPath);
    this.db = low(adapter);

    // Initialise all collections
    this.db.defaults({
      organizations: [],
      documents: [],
      chunks: [],
      businessMaps: [],
      knowledgeMaps: [],
      validations: [],
      insights: [],
      conversations: [],
      actions: [],
      activity: []
    }).write();
  }

  async insert(collection, record) {
    this.db.get(collection).push(record).write();
    return record;
  }

  async findById(collection, id) {
    return this.db.get(collection).find({ id }).value() || null;
  }

  async findOne(collection, query) {
    return this.db.get(collection).find(query).value() || null;
  }

  async findMany(collection, query = {}, opts = {}) {
    let chain = this.db.get(collection);

    // Filter
    if (Object.keys(query).length > 0) {
      chain = chain.filter(query);
    }

    let results = chain.value();

    // Sort
    if (opts.sortBy) {
      results = results.sort((a, b) => {
        const dir = opts.sortDir === 'desc' ? -1 : 1;
        return a[opts.sortBy] > b[opts.sortBy] ? dir : -dir;
      });
    }

    // Limit / offset
    if (opts.offset) results = results.slice(opts.offset);
    if (opts.limit) results = results.slice(0, opts.limit);

    return results;
  }

  async update(collection, id, data) {
    const existing = await this.findById(collection, id);
    if (!existing) return null;
    const updated = { ...existing, ...data, id, updatedAt: new Date().toISOString() };
    this.db.get(collection).find({ id }).assign(updated).write();
    return updated;
  }

  async delete(collection, id) {
    this.db.get(collection).remove({ id }).write();
  }

  async count(collection, query = {}) {
    return this.db.get(collection).filter(query).size().value();
  }
}

module.exports = LowdbAdapter;
