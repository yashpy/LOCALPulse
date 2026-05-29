const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate a professional, friendly response to a customer review.
 * @param {object} review - { rating, text, businessName, businessType }
 * @returns {string} AI-generated response
 */
async function generateReviewResponse(review) {
  const { rating, text, businessName, businessType } = review;
  const sentiment = rating >= 4 ? 'positive' : rating === 3 ? 'neutral' : 'negative';

  const prompt = `You are the owner of "${businessName}", a ${businessType} in Tempe, AZ.
Write a SHORT (2-3 sentence), genuine, professional response to this ${sentiment} customer review.
DO NOT use generic phrases like "We appreciate your feedback."
Be specific, warm, and human. If negative, acknowledge the issue and offer to make it right.

Review (${rating}/5 stars): "${text}"

Response:`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 150,
    temperature: 0.7,
  });

  return response.choices[0].message.content.trim();
}

/**
 * Generate weekly AI insights report for a business.
 * @param {object} data - { businessName, reviews, revenueData, topHours }
 * @returns {object} { summary, topInsight, recommendation, promotionIdea }
 */
async function generateWeeklyInsights(data) {
  const { businessName, reviews, avgRating, slowestDay, busiestHour, recentReviews } = data;

  const prompt = `You are a business analyst for small businesses in Tempe, AZ.
Based on the data below for "${businessName}", generate actionable weekly insights.

Data:
- Average rating this week: ${avgRating}/5
- Slowest day: ${slowestDay}
- Busiest hour: ${busiestHour}
- Recent review snippets: ${recentReviews?.join('; ') || 'none'}

Return ONLY a JSON object (no markdown) with these fields:
{
  "summary": "2-sentence week summary",
  "topInsight": "The single most important data point they should know",
  "recommendation": "One specific, actionable thing they should do this week",
  "promotionIdea": "A specific promotion idea targeting their slow period"
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 400,
    temperature: 0.6,
  });

  const raw = response.choices[0].message.content.trim();
  try {
    return JSON.parse(raw);
  } catch {
    return { summary: raw, topInsight: '', recommendation: '', promotionIdea: '' };
  }
}

/**
 * Generate an SMS promotion message for slow hours.
 * @param {object} data - { businessName, businessType, offer, slowPeriod }
 * @returns {string} SMS text (under 160 chars)
 */
async function generateSmsPromo(data) {
  const { businessName, businessType, slowPeriod } = data;

  const prompt = `Write a SHORT SMS promotion (under 130 characters) for "${businessName}", a ${businessType} in Tempe, AZ.
It's currently a slow period (${slowPeriod}). Create urgency. Include a simple offer.
SMS only — no emojis, no links, just text.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 60,
    temperature: 0.8,
  });

  return response.choices[0].message.content.trim();
}

module.exports = { generateReviewResponse, generateWeeklyInsights, generateSmsPromo };
