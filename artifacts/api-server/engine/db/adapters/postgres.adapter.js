/**
 * src/db/adapters/postgres.adapter.js
 *
 * PostgreSQL / Supabase adapter — implements RepositoryInterface.
 *
 * TO ACTIVATE:
 *   npm install pg
 *   Set DATABASE_URL in .env
 *   In src/db/index.js: change LowdbAdapter to PostgresAdapter
 *
 * Table setup: run migrations in /migrations/*.sql
 * Each collection maps to a table of the same name.
 * Records are stored as JSONB for flexibility at MVP stage,
 * then columns can be normalised in production.
 */

const RepositoryInterface = require('../repository.interface');

class PostgresAdapter extends RepositoryInterface {
  constructor() {
    super();
    // Lazy-load pg so it's optional at prototype stage
    const { Pool } = require('pg');
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  async insert(collection, record) {
    const q = `INSERT INTO ${collection} (id, data, created_at)
               VALUES ($1, $2, NOW()) RETURNING *`;
    const { rows } = await this.pool.query(q, [record.id, JSON.stringify(record)]);
    return rows[0]?.data || record;
  }

  async findById(collection, id) {
    const q = `SELECT data FROM ${collection} WHERE id = $1 LIMIT 1`;
    const { rows } = await this.pool.query(q, [id]);
    return rows[0]?.data || null;
  }

  async findOne(collection, query) {
    const results = await this.findMany(collection, query, { limit: 1 });
    return results[0] || null;
  }

  async findMany(collection, query = {}, opts = {}) {
    // For MVP: filter in JS after fetch. Optimise with WHERE clauses in production.
    let q = `SELECT data FROM ${collection}`;
    const params = [];

    if (opts.sortBy) {
      q += ` ORDER BY data->>'${opts.sortBy}' ${opts.sortDir === 'desc' ? 'DESC' : 'ASC'}`;
    }
    if (opts.limit) {
      params.push(opts.limit);
      q += ` LIMIT $${params.length}`;
    }
    if (opts.offset) {
      params.push(opts.offset);
      q += ` OFFSET $${params.length}`;
    }

    const { rows } = await this.pool.query(q, params);
    let results = rows.map(r => r.data);

    // Apply query filter
    if (Object.keys(query).length > 0) {
      results = results.filter(r =>
        Object.entries(query).every(([k, v]) => r[k] === v)
      );
    }

    return results;
  }

  async update(collection, id, data) {
    const existing = await this.findById(collection, id);
    if (!existing) return null;
    const updated = { ...existing, ...data, id, updatedAt: new Date().toISOString() };
    const q = `UPDATE ${collection} SET data = $1, updated_at = NOW() WHERE id = $2`;
    await this.pool.query(q, [JSON.stringify(updated), id]);
    return updated;
  }

  async delete(collection, id) {
    await this.pool.query(`DELETE FROM ${collection} WHERE id = $1`, [id]);
  }

  async count(collection, query = {}) {
    const { rows } = await this.pool.query(`SELECT data FROM ${collection}`);
    let results = rows.map(r => r.data);
    if (Object.keys(query).length > 0) {
      results = results.filter(r =>
        Object.entries(query).every(([k, v]) => r[k] === v)
      );
    }
    return results.length;
  }
}

module.exports = PostgresAdapter;
