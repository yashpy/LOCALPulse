const axios = require('axios');

const YELP_KEY = process.env.YELP_API_KEY;
const BASE_URL = 'https://api.yelp.com/v3';

const yelpClient = axios.create({
  baseURL: BASE_URL,
  headers: { Authorization: `Bearer ${YELP_KEY}` },
});

/**
 * Search for a business on Yelp.
 * @param {string} name - Business name
 * @param {string} location - e.g. "Tempe, AZ"
 * @returns {object} Yelp business object
 */
async function searchBusiness(name, location = 'Tempe, AZ') {
  const response = await yelpClient.get('/businesses/search', {
    params: { term: name, location, limit: 1 },
  });

  const businesses = response.data.businesses;
  if (!businesses || businesses.length === 0) {
    throw new Error(`No Yelp result found for: ${name} in ${location}`);
  }

  return businesses[0];
}

/**
 * Get reviews for a Yelp business.
 * @param {string} yelpId - Yelp business ID
 * @returns {Array} Array of review objects
 */
async function getReviews(yelpId) {
  const response = await yelpClient.get(`/businesses/${yelpId}/reviews`, {
    params: { limit: 20, sort_by: 'newest' },
  });

  return (response.data.reviews || []).map((r) => ({
    author: r.user.name,
    rating: r.rating,
    text: r.text,
    time: r.time_created,
    url: r.url,
    source: 'yelp',
  }));
}

/**
 * Get business details from Yelp including hours.
 * @param {string} yelpId
 * @returns {object} Business details
 */
async function getBusinessDetails(yelpId) {
  const response = await yelpClient.get(`/businesses/${yelpId}`);
  return response.data;
}

module.exports = { searchBusiness, getReviews, getBusinessDetails };
