const express = require('express');
const router = express.Router();
const { generateWeeklyInsights } = require('../services/openai');

/**
 * POST /api/insights/weekly
 * Generate a weekly AI insights report for a business.
 * Body: { businessName, avgRating, slowestDay, busiestHour, recentReviews }
 */
router.post('/weekly', async (req, res, next) => {
  try {
    const { businessName, avgRating, slowestDay, busiestHour, recentReviews } = req.body;

    if (!businessName) {
      return res.status(400).json({ error: 'businessName is required' });
    }

    const insights = await generateWeeklyInsights({
      businessName,
      avgRating: avgRating || 4.2,
      slowestDay: slowestDay || 'Tuesday',
      busiestHour: busiestHour || '12pm-2pm',
      recentReviews: recentReviews || [],
    });

    res.json({ businessName, generatedAt: new Date().toISOString(), insights });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/insights/demo
 * Returns mock insights data for demo/testing without API keys.
 */
router.get('/demo', async (req, res) => {
  res.json({
    businessName: 'Casa Tempe Restaurant',
    generatedAt: new Date().toISOString(),
    insights: {
      summary:
        'Strong week overall with a 4.3 average rating across 12 new reviews. Tuesday and Wednesday remained your slowest days.',
      topInsight:
        'Your lunch rush (11am-1pm) drove 67% of weekday revenue — protecting this window is critical.',
      recommendation:
        'Respond to the 2 unanswered 3-star reviews from this week — response rate directly impacts your Google ranking.',
      promotionIdea:
        'Run a "Tuesday Taco Deal" — 20% off between 2pm-5pm to fill your slowest slot. Push it via SMS Tuesday morning.',
    },
    metrics: {
      avgRating: 4.3,
      newReviews: 12,
      unansweredReviews: 2,
      slowestDay: 'Tuesday',
      busiestHour: '12pm-1pm',
      estimatedFootTraffic: 284,
    },
  });
});

module.exports = router;
