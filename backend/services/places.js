// Node 18+ has fetch built in, no dependency needed.

const YELP_API_KEY = process.env.YELP_API_KEY;
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Find (or reuse a cached) Yelp business id by name + address, then pull
// rating/review data for it.
async function fetchYelpData(business) {
  if (!YELP_API_KEY) return { error: 'YELP_API_KEY not configured' };

  let yelpId = business.yelp_id;

  if (!yelpId) {
    const searchUrl = new URL('https://api.yelp.com/v3/businesses/search');
    searchUrl.searchParams.set('term', business.name);
    searchUrl.searchParams.set(
      'location',
      business.address || 'Tempe, AZ'
    );
    searchUrl.searchParams.set('limit', '1');

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${YELP_API_KEY}` },
    });
    if (!searchRes.ok) {
      return { error: `Yelp search failed (${searchRes.status})` };
    }
    const searchData = await searchRes.json();
    yelpId = searchData.businesses?.[0]?.id;
    if (!yelpId) return { error: 'No matching Yelp listing found' };
  }

  const detailRes = await fetch(
    `https://api.yelp.com/v3/businesses/${yelpId}`,
    { headers: { Authorization: `Bearer ${YELP_API_KEY}` } }
  );
  if (!detailRes.ok) return { error: `Yelp detail fetch failed (${detailRes.status})` };
  const detail = await detailRes.json();

  return {
    yelpId,
    rating: detail.rating,
    reviewCount: detail.review_count,
    url: detail.url,
    price: detail.price,
  };
}

// Find (or reuse a cached) Google Place ID, then pull rating + recent
// reviews via Place Details.
async function fetchGoogleData(business) {
  if (!GOOGLE_PLACES_API_KEY) {
    return { error: 'GOOGLE_PLACES_API_KEY not configured' };
  }

  let placeId = business.google_place_id;

  if (!placeId) {
    const findUrl = new URL(
      'https://maps.googleapis.com/maps/api/place/findplacefromtext/json'
    );
    findUrl.searchParams.set(
      'input',
      `${business.name} ${business.address || 'Tempe, AZ'}`
    );
    findUrl.searchParams.set('inputtype', 'textquery');
    findUrl.searchParams.set('fields', 'place_id');
    findUrl.searchParams.set('key', GOOGLE_PLACES_API_KEY);

    const findRes = await fetch(findUrl);
    const findData = await findRes.json();
    placeId = findData.candidates?.[0]?.place_id;
    if (!placeId) return { error: 'No matching Google Places listing found' };
  }

  const detailUrl = new URL(
    'https://maps.googleapis.com/maps/api/place/details/json'
  );
  detailUrl.searchParams.set('place_id', placeId);
  detailUrl.searchParams.set(
    'fields',
    'name,rating,user_ratings_total,reviews,formatted_address'
  );
  detailUrl.searchParams.set('key', GOOGLE_PLACES_API_KEY);

  const detailRes = await fetch(detailUrl);
  const detailData = await detailRes.json();
  const result = detailData.result || {};

  return {
    placeId,
    rating: result.rating,
    userRatingsTotal: result.user_ratings_total,
    reviews: (result.reviews || []).slice(0, 5).map((r) => ({
      author: r.author_name,
      rating: r.rating,
      text: r.text,
      time: r.relative_time_description,
    })),
  };
}

module.exports = { fetchYelpData, fetchGoogleData };
