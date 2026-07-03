const fetch = require('node-fetch');

const YELP_BASE = 'https://api.yelp.com/v3';

/**
 * Search Yelp for a business by name in Tempe, AZ (or match by stored yelp_id).
 * Returns normalized live data: rating, review_count, price, is_open_now, photos, url, categories.
 */
async function getYelpData({ name, yelpId }) {
  if (!process.env.YELP_API_KEY) {
    throw new Error('YELP_API_KEY not configured in .env');
  }

  const headers = { Authorization: `Bearer ${process.env.YELP_API_KEY}` };

  let businessId = yelpId;

  if (!businessId) {
    const searchUrl = `${YELP_BASE}/businesses/search?term=${encodeURIComponent(
      name
    )}&location=${encodeURIComponent('Tempe, AZ')}&limit=1`;
    const searchRes = await fetch(searchUrl, { headers });
    if (!searchRes.ok) throw new Error(`Yelp search failed: ${searchRes.status}`);
    const searchData = await searchRes.json();
    if (!searchData.businesses || searchData.businesses.length === 0) {
      return null;
    }
    businessId = searchData.businesses[0].id;
  }

  const detailRes = await fetch(`${YELP_BASE}/businesses/${businessId}`, { headers });
  if (!detailRes.ok) throw new Error(`Yelp details failed: ${detailRes.status}`);
  const b = await detailRes.json();

  return {
    source: 'yelp',
    yelp_id: b.id,
    name: b.name,
    rating: b.rating,
    review_count: b.review_count,
    price: b.price || null,
    is_open_now: b.hours && b.hours[0] ? Boolean(b.hours[0].is_open_now) : null,
    categories: (b.categories || []).map((c) => c.title),
    phone: b.display_phone,
    url: b.url,
    photos: b.photos || [],
    address: b.location ? b.location.display_address.join(', ') : null,
    fetched_at: new Date().toISOString()
  };
}

module.exports = { getYelpData };
