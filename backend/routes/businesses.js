const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const googleService = require('../services/google');
const yelpService = require('../services/yelp');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * GET /api/businesses
 * List all registered businesses.
 */
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ businesses: data });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/businesses
 * Register a new business. Auto-fetches Google + Yelp data.
 * Body: { name, type, address, ownerEmail, ownerPhone }
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, type, address, ownerEmail, ownerPhone } = req.body;

    if (!name || !ownerEmail) {
      return res.status(400).json({ error: 'name and ownerEmail are required' });
    }

    // Try to auto-fetch Google Place ID
    let googlePlaceId = null;
    let googleRating = null;
    let googleReviewCount = null;

    try {
      const googleResult = await googleService.searchBusiness(`${name} ${address || 'Tempe AZ'}`);
      googlePlaceId = googleResult.place_id;
      googleRating = googleResult.rating;
      googleReviewCount = googleResult.user_ratings_total;
    } catch {
      console.warn(`Could not find Google Places entry for: ${name}`);
    }

    // Try to auto-fetch Yelp ID
    let yelpId = null;
    let yelpRating = null;

    try {
      const yelpResult = await yelpService.searchBusiness(name);
      yelpId = yelpResult.id;
      yelpRating = yelpResult.rating;
    } catch {
      console.warn(`Could not find Yelp entry for: ${name}`);
    }

    // Save to Supabase
    const { data, error } = await supabase
      .from('businesses')
      .insert([
        {
          name,
          type,
          address,
          owner_email: ownerEmail,
          owner_phone: ownerPhone,
          google_place_id: googlePlaceId,
          google_rating: googleRating,
          google_review_count: googleReviewCount,
          yelp_id: yelpId,
          yelp_rating: yelpRating,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ business: data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/businesses/:id
 * Get a single business with full details.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Business not found' });

    res.json({ business: data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
