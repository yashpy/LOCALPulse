const express = require('express');
const router = express.Router();
const googleService = require('../services/google');
const yelpService = require('../services/yelp');
const { generateReviewResponse } = require('../services/openai');

/**
 * POST /api/reviews/respond
 * Generate an AI response to a specific review.
 * Body: { reviewText, rating, businessName, businessType }
 * NOTE: Must be registered BEFORE /:businessId to avoid Express treating
 * "respond" as a businessId param value.
 */
router.post('/respond', async (req, res, next) => {
  try {
    const { reviewText, rating, businessName, businessType } = req.body;

    if (!reviewText || !rating || !businessName) {
      return res.status(400).json({ error: 'reviewText, rating, and businessName are required' });
    }

    const response = await generateReviewResponse({
      text: reviewText,
      rating: parseInt(rating),
      businessName,
      businessType: businessType || 'local business',
    });

    res.json({ response });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/reviews/respond-batch
 * Generate AI responses for all unresponded reviews.
 * Body: { reviews: [{text, rating}], businessName, businessType }
 */
router.post('/respond-batch', async (req, res, next) => {
  try {
    const { reviews, businessName, businessType } = req.body;

    if (!reviews || !Array.isArray(reviews)) {
      return res.status(400).json({ error: 'reviews array is required' });
    }

    const unresponded = reviews.filter((r) => !r.responded);

    const results = await Promise.all(
      unresponded.map(async (review) => {
        const response = await generateReviewResponse({
          text: review.text,
          rating: review.rating,
          businessName,
          businessType,
        });
        return { ...review, suggestedResponse: response };
      })
    );

    res.json({ count: results.length, reviews: results });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reviews/:businessId
 * Fetch all reviews (Google + Yelp) for a business.
 * NOTE: Wildcard param route — must come AFTER static routes above.
 */
router.get('/:businessId', async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { googlePlaceId, yelpId } = req.query;

    const reviews = [];

    // Fetch Google reviews
    if (googlePlaceId) {
      const googleReviews = await googleService.getReviews(googlePlaceId);
      reviews.push(...googleReviews);
    }

    // Fetch Yelp reviews
    if (yelpId) {
      const yelpReviews = await yelpService.getReviews(yelpId);
      reviews.push(...yelpReviews);
    }

    // Sort by newest first
    reviews.sort((a, b) => new Date(b.time) - new Date(a.time));

    // Calculate aggregate stats
    const avgRating = reviews.length
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0;

    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => breakdown[r.rating]++);

    res.json({
      businessId,
      total: reviews.length,
      avgRating: parseFloat(avgRating),
      breakdown,
      reviews,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
