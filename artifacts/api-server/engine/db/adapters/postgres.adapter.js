/**
 * src/db/adapters/postgres.adapter.js
 *
 * PostgreSQL adapter — implements RepositoryInterface.
 *
 * Each collection maps to a table of the same name with shape:
 *   id          TEXT PRIMARY KEY
 *   data        JSONB        (the full record)
 *   created_at  TIMESTAMPTZ
 *   updated_at  TIMESTAMPTZ
 *
 * Tables are created on demand (CREATE TABLE IF NOT EXISTS) the first time a
 * collection is touched, so a fresh database "just works" with no migration
 * step — important for serverless cold starts on Vercel.
 *
 * Records are stored as JSONB for flexibility at MVP stage; columns can be
 * normalised later without changing the repository contract.
 */

const RepositoryInterface = require('../repository.interface');

// Only allow safe SQL identifiers for collection/table names.
const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

class PostgresAdapter extends RepositoryInterface {
  constructor() {
    super();
    const { Pool } = require('pg');
    // Serverless-safe pool: each warm function instance keeps its own pool, so
    // we cap connections low and let idle ones drop quickly to avoid exhausting
    // the database under bursty concurrency. Tunable via env for other targets.
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.PG_POOL_MAX || 3),
      idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 10000),
      connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS || 10000),
      allowExitOnIdle: true
    });
    this._ensured = new Set();
  }

  _table(collection) {
    if (!IDENT.test(collection)) {
      throw new Error(`Invalid collection name: ${collection}`);
    }
    return `"${collection}"`;
  }

  async _ensure(collection) {
    if (this._ensured.has(collection)) return;
    const t = this._table(collection);
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS ${t} (
         id TEXT PRIMARY KEY,
         data JSONB NOT NULL,
         created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
         updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       )`
    );
    this._ensured.add(collection);
  }

  async insert(collection, record) {
    await this._ensure(collection);
    const t = this._table(collection);
    const q = `INSERT INTO ${t} (id, data, created_at, updated_at)
               VALUES ($1, $2, NOW(), NOW()) RETURNING data`;
    const { rows } = await this.pool.query(q, [record.id, JSON.stringify(record)]);
    return rows[0]?.data || record;
  }

  async findById(collection, id) {
    await this._ensure(collection);
    const t = this._table(collection);
    const { rows } = await this.pool.query(
      `SELECT data FROM ${t} WHERE id = $1 LIMIT 1`,
      [id]
    );
    return rows[0]?.data || null;
  }

  async findOne(collection, query) {
    const results = await this.findMany(collection, query, { limit: 1 });
    return results[0] || null;
  }

  async findMany(collection, query = {}, opts = {}) {
    await this._ensure(collection);
    const t = this._table(collection);

    // MVP: filter in JS after fetch. Optimise with WHERE clauses in production.
    let q = `SELECT data FROM ${t}`;
    const params = [];

    if (opts.sortBy && IDENT.test(opts.sortBy)) {
      q += ` ORDER BY data->>'${opts.sortBy}' ${opts.sortDir === 'desc' ? 'DESC' : 'ASC'}`;
    }

    const { rows } = await this.pool.query(q, params);
    let results = rows.map(r => r.data);

    // Apply equality filter
    if (Object.keys(query).length > 0) {
      results = results.filter(r =>
        Object.entries(query).every(([k, v]) => r[k] === v)
      );
    }

    // Offset / limit applied after filtering so they match lowdb semantics.
    if (opts.offset) results = results.slice(opts.offset);
    if (opts.limit) results = results.slice(0, opts.limit);

    return results;
  }

  async update(collection, id, data) {
    await this._ensure(collection);
    const existing = await this.findById(collection, id);
    if (!existing) return null;
    const updated = { ...existing, ...data, id, updatedAt: new Date().toISOString() };
    const t = this._table(collection);
    await this.pool.query(
      `UPDATE ${t} SET data = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(updated), id]
    );
    return updated;
  }

  async delete(collection, id) {
    await this._ensure(collection);
    const t = this._table(collection);
    await this.pool.query(`DELETE FROM ${t} WHERE id = $1`, [id]);
  }

  async count(collection, query = {}) {
    await this._ensure(collection);
    const t = this._table(collection);
    if (Object.keys(query).length === 0) {
      const { rows } = await this.pool.query(`SELECT COUNT(*)::int AS n FROM ${t}`);
      return rows[0]?.n || 0;
    }
    const { rows } = await this.pool.query(`SELECT data FROM ${t}`);
    return rows
      .map(r => r.data)
      .filter(r => Object.entries(query).every(([k, v]) => r[k] === v)).length;
  }
}

module.exports = PostgresAdapter;
