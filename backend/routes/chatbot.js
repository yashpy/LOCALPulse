const express = require('express');
const fetch = require('node-fetch');
const { supabaseAdmin } = require('../db/supabase');
const { requireAuth } = require('../middleware/auth');
const { getYelpData } = require('../services/yelp');
const { getGoogleData } = require('../services/google');

const router = express.Router();
router.use(requireAuth);

function canAccessBusiness(user, business) {
  if (!business) return false;
  if (user.role === 'admin') return true;
  return business.owner_id === user.id;
}

async function findBusiness(id) {
  const { data } = await supabaseAdmin.from('businesses').select('*').eq('id', id).single();
  return data || null;
}

// POST /api/businesses/:id/chat  { message }
router.post('/:id/chat', async (req, res) => {
  const business = await findBusiness(req.params.id);
  if (!canAccessBusiness(req.user, business)) return res.status(404).json({ error: 'Not found' });

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not configured in .env' });

  // Pull fresh live data so advice is grounded in real numbers, not guesses
  let yelp = null;
  let google = null;
  try { yelp = await getYelpData({ name: business.name, yelpId: business.yelp_id }); } catch (e) { /* non-fatal */ }
  try { google = await getGoogleData({ name: business.name, placeId: business.google_place_id }); } catch (e) { /* non-fatal */ }

  const { data: history } = await supabaseAdmin
    .from('chat_logs').select('role, message').eq('business_id', business.id).order('id', { ascending: true }).limit(10);

  const systemPrompt = `You are the LOCALPulse business advisor for "${business.name}", a ${business.category || 'local'} business in Tempe, AZ.
Use the real-time data below to give specific, actionable suggestions to improve the business (ratings, reviews, visibility, operations). Be concrete, reference actual numbers when available, and keep replies concise.

LIVE YELP DATA: ${yelp ? JSON.stringify(yelp) : 'unavailable'}
LIVE GOOGLE DATA: ${google ? JSON.stringify(google) : 'unavailable'}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(history || []).map((h) => ({ role: h.role, content: h.message })),
    { role: 'user', content: message }
  ];

  try {
    const apiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        max_tokens: 700,
        messages
      })
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return res.status(502).json({ error: `OpenAI API error: ${errText}` });
    }

    const data = await apiRes.json();
    const reply = (data.choices?.[0]?.message?.content || '').trim();

    await supabaseAdmin.from('chat_logs').insert([
      { business_id: business.id, role: 'user', message },
      { business_id: business.id, role: 'assistant', message: reply }
    ]);

    res.json({ reply, grounded_in: { yelp: Boolean(yelp), google: Boolean(google) } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/businesses/:id/chat  -> history
router.get('/:id/chat', async (req, res) => {
  const business = await findBusiness(req.params.id);
  if (!canAccessBusiness(req.user, business)) return res.status(404).json({ error: 'Not found' });
  const { data, error } = await supabaseAdmin
    .from('chat_logs').select('role, message, created_at').eq('business_id', business.id).order('id', { ascending: true });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

module.exports = router;
