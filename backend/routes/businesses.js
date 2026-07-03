const express = require('express');
const { supabaseAdmin } = require('../db/supabase');
const { requireAuth, requireRole } = require('../middleware/auth');
const { getYelpData } = require('../services/yelp');
const { getGoogleData } = require('../services/google');

const router = express.Router();
router.use(requireAuth);

function canAccessBusiness(user, business) {
  if (!business) return false;
  if (user.role === 'admin') return true;
  return business.owner_id === user.id;
}

async function findBusiness(id) {
  const { data } = await supabaseAdmin.from('businesses').select('*').eq('id', id).single();
  return data || null;
}

// GET /api/businesses  -> admin: all businesses, owner: only their own
router.get('/', async (req, res) => {
  let query = supabaseAdmin.from('businesses').select('*').order('created_at', { ascending: false });
  if (req.user.role !== 'admin') query = query.eq('owner_id', req.user.id);
  const { data, error } = await query;
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// GET /api/businesses/:id
router.get('/:id', async (req, res) => {
  const business = await findBusiness(req.params.id);
  if (!canAccessBusiness(req.user, business)) return res.status(404).json({ error: 'Not found' });
  res.json(business);
});

// POST /api/businesses  (ADMIN ONLY - creates a business and assigns an owner)
router.post('/', requireRole('admin'), async (req, res) => {
  const { owner_id, name, category, address, phone, yelp_id, google_place_id } = req.body;
  if (!owner_id || !name) return res.status(400).json({ error: 'owner_id and name are required' });

  const { data, error } = await supabaseAdmin
    .from('businesses')
    .insert({ owner_id, name, category, address, phone, yelp_id, google_place_id })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/businesses/:id  (admin: any business, owner: only their own, cannot reassign owner)
router.put('/:id', async (req, res) => {
  const business = await findBusiness(req.params.id);
  if (!canAccessBusiness(req.user, business)) return res.status(404).json({ error: 'Not found' });

  const { name, category, address, phone, yelp_id, google_place_id, owner_id } = req.body;
  const patch = {
    name: name ?? business.name,
    category: category ?? business.category,
    address: address ?? business.address,
    phone: phone ?? business.phone,
    yelp_id: yelp_id ?? business.yelp_id,
    google_place_id: google_place_id ?? business.google_place_id,
    updated_at: new Date().toISOString()
  };
  if (req.user.role === 'admin' && owner_id) patch.owner_id = owner_id;

  const { data, error } = await supabaseAdmin.from('businesses').update(patch).eq('id', business.id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// DELETE /api/businesses/:id  (ADMIN ONLY)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  const business = await findBusiness(req.params.id);
  if (!business) return res.status(404).json({ error: 'Not found' });
  const { error } = await supabaseAdmin.from('businesses').delete().eq('id', business.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ deleted: true });
});

// GET /api/businesses/:id/live-data  -> real-time Yelp + Google fetch
router.get('/:id/live-data', async (req, res) => {
  const business = await findBusiness(req.params.id);
  if (!canAccessBusiness(req.user, business)) return res.status(404).json({ error: 'Not found' });

  const results = { yelp: null, google: null, errors: [] };

  try {
    results.yelp = await getYelpData({ name: business.name, yelpId: business.yelp_id });
    if (results.yelp && !business.yelp_id) {
      await supabaseAdmin.from('businesses').update({ yelp_id: results.yelp.yelp_id }).eq('id', business.id);
    }
  } catch (e) {
    results.errors.push(`Yelp: ${e.message}`);
  }

  try {
    results.google = await getGoogleData({ name: business.name, placeId: business.google_place_id });
    if (results.google && !business.google_place_id) {
      await supabaseAdmin.from('businesses').update({ google_place_id: results.google.place_id }).eq('id', business.id);
    }
  } catch (e) {
    results.errors.push(`Google: ${e.message}`);
  }

  res.json(results);
});

module.exports = router;
