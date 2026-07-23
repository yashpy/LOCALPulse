const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password required' });
  }

  const { rows } = await query('SELECT * FROM users WHERE email = $1', [
    email.toLowerCase().trim(),
  ]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  res.json({
    token: signToken(user),
    user: { id: user.id, email: user.email, role: user.role },
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/owners  (admin only — creates an owner account directly,
// simplified stand-in for the invite-email flow described in the README)
router.post('/owners', requireAuth, requireAdmin, async (req, res) => {
  const { email, password, businessName, address } = req.body || {};
  if (!email || !password || !businessName) {
    return res
      .status(400)
      .json({ error: 'email, password, businessName required' });
  }

  const existing = await query('SELECT id FROM users WHERE email = $1', [
    email.toLowerCase().trim(),
  ]);
  if (existing.rows.length) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const { rows: userRows } = await query(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1, $2, 'owner') RETURNING id, email, role`,
    [email.toLowerCase().trim(), passwordHash]
  );
  const owner = userRows[0];

  const { rows: bizRows } = await query(
    `INSERT INTO businesses (owner_id, name, address)
     VALUES ($1, $2, $3) RETURNING *`,
    [owner.id, businessName, address || null]
  );

  res.status(201).json({ owner, business: bizRows[0] });
});

module.exports = router;
