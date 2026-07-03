const fetch = require('node-fetch');

const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';

/**
 * Look up a business on Google Places by name in Tempe, AZ (or by stored place_id).
 * Returns normalized live data: rating, user_ratings_total, opening_hours, reviews.
 */
async function getGoogleData({ name, placeId }) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error('GOOGLE_PLACES_API_KEY not configured in .env');

  let resolvedPlaceId = placeId;

  if (!resolvedPlaceId) {
    const findUrl = `${PLACES_BASE}/findplacefromtext/json?input=${encodeURIComponent(
      name + ' Tempe AZ'
    )}&inputtype=textquery&fields=place_id&key=${key}`;
    const findRes = await fetch(findUrl);
    const findData = await findRes.json();
    if (!findData.candidates || findData.candidates.length === 0) return null;
    resolvedPlaceId = findData.candidates[0].place_id;
  }

  const fields = [
    'name',
    'rating',
    'user_ratings_total',
    'opening_hours',
    'formatted_phone_number',
    'formatted_address',
    'price_level',
    'reviews',
    'url'
  ].join(',');

  const detailUrl = `${PLACES_BASE}/details/json?place_id=${resolvedPlaceId}&fields=${fields}&key=${key}`;
  const detailRes = await fetch(detailUrl);
  const detailData = await detailRes.json();
  if (detailData.status !== 'OK') return null;

  const r = detailData.result;
  return {
    source: 'google',
    place_id: resolvedPlaceId,
    name: r.name,
    rating: r.rating,
    review_count: r.user_ratings_total,
    price_level: r.price_level ?? null,
    is_open_now: r.opening_hours ? r.opening_hours.open_now : null,
    weekday_text: r.opening_hours ? r.opening_hours.weekday_text : [],
    phone: r.formatted_phone_number,
    address: r.formatted_address,
    reviews: (r.reviews || []).slice(0, 5).map((rev) => ({
      author: rev.author_name,
      rating: rev.rating,
      text: rev.text,
      time: rev.relative_time_description
    })),
    url: r.url,
    fetched_at: new Date().toISOString()
  };
}

module.exports = { getGoogleData };
