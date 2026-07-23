// Node 18+ has fetch built in, no dependency needed.
//
// Works with any OpenAI-compatible chat completions API (OpenAI itself,
// Groq, etc.) — just set AI_PROVIDER + the matching key/model. Groq is
// free and uses the same request/response shape as OpenAI, but only
// serves open models (no gpt-4o) — see AI_MODEL below.

const AI_PROVIDER = (process.env.AI_PROVIDER || 'openai').toLowerCase();

const PROVIDER_CONFIG = {
  openai: {
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    apiKey: process.env.OPENAI_API_KEY,
    defaultModel: 'gpt-4o',
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    apiKey: process.env.GROQ_API_KEY,
    defaultModel: 'llama-3.3-70b-versatile',
  },
};

const config = PROVIDER_CONFIG[AI_PROVIDER] || PROVIDER_CONFIG.openai;
const AI_MODEL = process.env.AI_MODEL || config.defaultModel;

// Summarize/advise on a business's live review data.
// `question` is optional free text from the owner (chat advisor);
// if omitted, generates a general health summary.
async function analyzeReviews(business, cachedData, question) {
  if (!config.apiKey) {
    return { error: `${AI_PROVIDER === 'groq' ? 'GROQ_API_KEY' : 'OPENAI_API_KEY'} not configured` };
  }

  const context = {
    name: business.name,
    address: business.address,
    yelp: cachedData?.yelp,
    google: cachedData?.google,
  };

  const systemPrompt =
    'You are a business advisor for a small local business owner in Tempe, AZ. ' +
    'You are given their live Yelp and Google ratings/reviews as JSON. ' +
    'Give specific, actionable, concise advice grounded only in the data provided. ' +
    "If the data is sparse or missing, say so rather than inventing details.";

  const userPrompt = question
    ? `Business data:\n${JSON.stringify(context)}\n\nOwner question: ${question}`
    : `Business data:\n${JSON.stringify(
        context
      )}\n\nGive a short summary of how this business is doing and 2-3 concrete suggestions.`;

  const res = await fetch(config.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { error: `${AI_PROVIDER} request failed (${res.status}): ${text}` };
  }

  const data = await res.json();
  return { reply: data.choices?.[0]?.message?.content || '' };
}

module.exports = { analyzeReviews };
