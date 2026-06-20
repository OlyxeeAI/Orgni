/**
 * src/db/repository.interface.js
 *
 * This is the contract every database adapter must implement.
 * Controllers and services ONLY talk to repositories — never to DB directly.
 *
 * To move from lowdb to PostgreSQL or Supabase:
 *   1. Create a new adapter in src/db/adapters/
 *   2. Implement every method below
 *   3. Change one line in src/db/index.js
 *   Zero other files change.
 *
 * Method contract:
 *   insert(collection, record)           → record
 *   findById(collection, id)             → record | null
 *   findOne(collection, query)           → record | null
 *   findMany(collection, query, opts)    → record[]
 *   update(collection, id, data)         → record | null
 *   delete(collection, id)              → void
 *   count(collection, query)             → number
 */

class RepositoryInterface {
  async insert(collection, record) { throw new Error('Not implemented'); }
  async findById(collection, id) { throw new Error('Not implemented'); }
  async findOne(collection, query) { throw new Error('Not implemented'); }
  async findMany(collection, query = {}, opts = {}) { throw new Error('Not implemented'); }
  async update(collection, id, data) { throw new Error('Not implemented'); }
  async delete(collection, id) { throw new Error('Not implemented'); }
  async count(collection, query = {}) { throw new Error('Not implemented'); }
}

module.exports = RepositoryInterface;
