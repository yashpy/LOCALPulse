const axios = require('axios');

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const BASE_URL = 'https://maps.googleapis.com/maps/api';

/**
 * Search for a business by name and location.
 * @param {string} query - e.g. "House of Tricks Tempe AZ"
 * @returns {object} place data
 */
async function searchBusiness(query) {
  const response = await axios.get(`${BASE_URL}/place/findplacefromtext/json`, {
    params: {
      input: query,
      inputtype: 'textquery',
      fields: 'place_id,name,formatted_address,rating,user_ratings_total,geometry',
      key: GOOGLE_API_KEY,
    },
  });

  const candidates = response.data.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error(`No Google Places result found for: ${query}`);
  }

  return candidates[0];
}

/**
 * Get full place details including reviews.
 * @param {string} placeId - Google Place ID
 * @returns {object} Full place details with reviews
 */
async function getPlaceDetails(placeId) {
  const response = await axios.get(`${BASE_URL}/place/details/json`, {
    params: {
      place_id: placeId,
      fields: [
        'name',
        'rating',
        'user_ratings_total',
        'reviews',
        'opening_hours',
        'formatted_phone_number',
        'website',
        'formatted_address',
      ].join(','),
      key: GOOGLE_API_KEY,
    },
  });

  if (response.data.status !== 'OK') {
    throw new Error(`Google Places error: ${response.data.status}`);
  }

  return response.data.result;
}

/**
 * Get recent reviews for a business.
 * @param {string} placeId
 * @returns {Array} Array of review objects
 */
async function getReviews(placeId) {
  const details = await getPlaceDetails(placeId);
  const reviews = details.reviews || [];

  return reviews.map((r) => ({
    author: r.author_name,
    rating: r.rating,
    text: r.text,
    time: new Date(r.time * 1000).toISOString(),
    relativeTime: r.relative_time_description,
    responded: !!r.owner_response,
    source: 'google',
  }));
}

module.exports = { searchBusiness, getPlaceDetails, getReviews };
