const express = require('express');
const { tenantQuery } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { fetchYelpData, fetchGoogleData } = require('../services/places');
const { analyzeReviews } = require('../services/openai');

const router = express.Router();
router.use(requireAuth);

// GET /api/businesses
// Admin -> all businesses. Owner -> only their own (enforced by RLS,
// this WHERE-less query relies entirely on the Postgres policy).
router.get('/', async (req, res) => {
  const { rows } = await tenantQuery(
    req.user,
    'SELECT * FROM businesses ORDER BY created_at DESC'
  );
  res.json({ businesses: rows });
});

// GET /api/businesses/:id
router.get('/:id', async (req, res) => {
  const { rows } = await tenantQuery(
    req.user,
    'SELECT * FROM businesses WHERE id = $1',
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json({ business: rows[0] });
});

// POST /api/businesses  (admin only — create a business record directly)
router.post('/', requireAdmin, async (req, res) => {
  const { ownerId, name, address, yelpId, googlePlaceId } = req.body || {};
  if (!ownerId || !name) {
    return res.status(400).json({ error: 'ownerId and name required' });
  }
  const { rows } = await tenantQuery(
    req.user,
    `INSERT INTO businesses (owner_id, name, address, yelp_id, google_place_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [ownerId, name, address || null, yelpId || null, googlePlaceId || null]
  );
  res.status(201).json({ business: rows[0] });
});

// PUT /api/businesses/:id
// Owners can edit their own business (e.g. pin yelp_id/google_place_id);
// admins can edit any business. RLS enforces this regardless of role checks
// here, but we also scope the WHERE clause for clarity.
router.put('/:id', async (req, res) => {
  const { name, address, yelpId, googlePlaceId } = req.body || {};
  const { rows } = await tenantQuery(
    req.user,
    `UPDATE businesses
     SET name = COALESCE($1, name),
         address = COALESCE($2, address),
         yelp_id = COALESCE($3, yelp_id),
         google_place_id = COALESCE($4, google_place_id),
         updated_at = now()
     WHERE id = $5
     RETURNING *`,
    [name, address, yelpId, googlePlaceId, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json({ business: rows[0] });
});

// DELETE /api/businesses/:id  (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  const { rowCount } = await tenantQuery(
    req.user,
    'DELETE FROM businesses WHERE id = $1',
    [req.params.id]
  );
  if (!rowCount) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

// POST /api/businesses/:id/refresh
// Pulls live Yelp + Google Places data, caches it on the row.
router.post('/:id/refresh', async (req, res) => {
  const { rows } = await tenantQuery(
    req.user,
    'SELECT * FROM businesses WHERE id = $1',
    [req.params.id]
  );
  const business = rows[0];
  if (!business) return res.status(404).json({ error: 'Not found' });

  const [yelp, google] = await Promise.all([
    fetchYelpData(business),
    fetchGoogleData(business),
  ]);

  const cachedData = { yelp, google, fetchedAt: new Date().toISOString() };

  const update = await tenantQuery(
    req.user,
    `UPDATE businesses
     SET cached_data = $1,
         cached_at = now(),
         yelp_id = COALESCE($2, yelp_id),
         google_place_id = COALESCE($3, google_place_id),
         updated_at = now()
     WHERE id = $4
     RETURNING *`,
    [
      JSON.stringify(cachedData),
      yelp.yelpId || null,
      google.placeId || null,
      business.id,
    ]
  );

  res.json({ business: update.rows[0] });
});

// POST /api/businesses/:id/advisor
// AI advisor chat, grounded in the business's cached live data.
router.post('/:id/advisor', async (req, res) => {
  const { message } = req.body || {};
  const { rows } = await tenantQuery(
    req.user,
    'SELECT * FROM businesses WHERE id = $1',
    [req.params.id]
  );
  const business = rows[0];
  if (!business) return res.status(404).json({ error: 'Not found' });

  const result = await analyzeReviews(business, business.cached_data, message);
  if (result.error) return res.status(502).json(result);

  await tenantQuery(
    req.user,
    `INSERT INTO chat_logs (business_id, role, content) VALUES ($1, 'user', $2), ($1, 'assistant', $3)`,
    [business.id, message || '(summary request)', result.reply]
  );

  res.json(result);
});

// GET /api/businesses/:id/chat
router.get('/:id/chat', async (req, res) => {
  const { rows } = await tenantQuery(
    req.user,
    'SELECT * FROM chat_logs WHERE business_id = $1 ORDER BY created_at ASC',
    [req.params.id]
  );
  res.json({ messages: rows });
});

module.exports = router;
