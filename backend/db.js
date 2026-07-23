const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
});

/**
 * Run a query as the currently logged-in user, with RLS session
 * variables set so Postgres enforces tenant isolation automatically.
 * Every business/chat_logs query in the app should go through this,
 * not through pool.query() directly.
 */
async function tenantQuery(user, text, params = []) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `SELECT set_config('app.current_user_id', $1, true),
              set_config('app.current_role', $2, true)`,
      [user.id, user.role]
    );
    const result = await client.query(text, params);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Plain (non-tenant-scoped) query — only used for auth lookups by email,
// which happen before we know who the user is.
function query(text, params = []) {
  return pool.query(text, params);
}

module.exports = { pool, query, tenantQuery };
