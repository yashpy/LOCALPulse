require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query, pool } = require('./db');

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env first.');
    process.exit(1);
  }

  const existing = await query('SELECT id FROM users WHERE email = $1', [
    email.toLowerCase().trim(),
  ]);
  if (existing.rows.length) {
    console.log('Admin already exists, nothing to do.');
    await pool.end();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await query(
    `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'admin')`,
    [email.toLowerCase().trim(), passwordHash]
  );
  console.log(`Admin account created: ${email}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
