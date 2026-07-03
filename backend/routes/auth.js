const express = require('express');
const { supabaseAdmin } = require('../db/supabase');
const { requireAuth, requireRole, requireAppKey } = require('../middleware/auth');
const { getGoogleData } = require('../services/google');
const { sendEmail, sendSms, triggerN8n } = require('../services/notify');

const router = express.Router();

function toSafeUser(u) {
  return { id: u.id, email: u.email, role: u.user_metadata?.role, name: u.user_metadata?.name || null };
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
  if (error || !data.session) return res.status(401).json({ error: error?.message || 'Invalid credentials' });

  res.json({ token: data.session.access_token, user: toSafeUser(data.user) });
});

// POST /api/auth/register-owner  (ADMIN ONLY - instantly invites an owner)
// Sends a Supabase Auth invite email with a link to /set-password.html
// where they choose their own password. No temp password to hand out.
router.post('/register-owner', requireAuth, requireRole('admin'), async (req, res) => {
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { role: 'business_owner', name: name || null },
    redirectTo: `${process.env.FRONTEND_URL}/set-password.html`
  });
  if (error) return res.status(400).json({ error: error.message });

  res.status(201).json(toSafeUser(data.user));
});

// POST /api/auth/request-access  (PUBLIC, gated by APP_API_KEY - self-service request)
// Verification note: no Google Business OAuth here (needs your own Google Cloud
// OAuth app + verified domain). Instead we look up a matching Google listing in
// Tempe as a signal for the admin, and notify you (email/SMS/n8n) to review.
router.post('/request-access', requireAppKey, async (req, res) => {
  const { email, name, business_name } = req.body;
  if (!email || !business_name) return res.status(400).json({ error: 'email and business_name are required' });

  let googleMatch = null;
  try {
    const g = await getGoogleData({ name: business_name });
    if (g) googleMatch = { name: g.name, address: g.address, rating: g.rating, place_id: g.place_id };
  } catch (e) {
    /* non-fatal */
  }

  const { data: request, error } = await supabaseAdmin
    .from('signup_requests')
    .insert({ email, name: name || null, business_name, google_match: googleMatch })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });

  await Promise.all([
    sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `LocalPulse: new access request — ${business_name}`,
      text: `${name || email} (${email}) requested access for "${business_name}".\nGoogle match: ${googleMatch ? googleMatch.name : 'none found'}.\nReview it in the admin dashboard.`
    }),
    sendSms(`LocalPulse: new access request from ${email} for "${business_name}".`),
    triggerN8n('signup-request-created', request)
  ]);

  res.status(201).json({
    id: request.id,
    status: 'pending',
    message: 'Request submitted. An admin will review and approve your account.',
    google_match_found: Boolean(googleMatch)
  });
});

// GET /api/auth/requests  (ADMIN ONLY)
router.get('/requests', requireAuth, requireRole('admin'), async (req, res) => {
  const { data, error } = await supabaseAdmin.from('signup_requests').select('*').order('created_at', { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// POST /api/auth/requests/:id/approve  (ADMIN ONLY)
router.post('/requests/:id/approve', requireAuth, requireRole('admin'), async (req, res) => {
  const { data: request, error: findErr } = await supabaseAdmin
    .from('signup_requests').select('*').eq('id', req.params.id).single();
  if (findErr || !request) return res.status(404).json({ error: 'Request not found' });

  const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(request.email, {
    data: { role: 'business_owner', name: request.name },
    redirectTo: `${process.env.FRONTEND_URL}/set-password.html`
  });
  if (inviteErr) return res.status(400).json({ error: inviteErr.message });

  const { data: business, error: bizErr } = await supabaseAdmin
    .from('businesses')
    .insert({
      owner_id: invited.user.id,
      name: request.business_name,
      google_place_id: request.google_match ? request.google_match.place_id : null
    })
    .select()
    .single();
  if (bizErr) return res.status(400).json({ error: bizErr.message });

  await supabaseAdmin.from('signup_requests').delete().eq('id', request.id);
  await triggerN8n('signup-request-approved', { request, business });

  res.json({ approved: true, owner: toSafeUser(invited.user), business });
});

// POST /api/auth/requests/:id/reject  (ADMIN ONLY)
router.post('/requests/:id/reject', requireAuth, requireRole('admin'), async (req, res) => {
  const { error, count } = await supabaseAdmin.from('signup_requests').delete({ count: 'exact' }).eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  if (!count) return res.status(404).json({ error: 'Request not found' });
  res.json({ rejected: true });
});

// GET /api/auth/owners  (ADMIN ONLY - list business owner accounts)
router.get('/owners', requireAuth, requireRole('admin'), async (req, res) => {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) return res.status(400).json({ error: error.message });
  const owners = data.users
    .filter((u) => u.user_metadata?.role === 'business_owner')
    .map((u) => ({ id: u.id, email: u.email, name: u.user_metadata?.name || null, created_at: u.created_at }));
  res.json(owners);
});

// DELETE /api/auth/owners/:id  (ADMIN ONLY - cascades to their businesses via FK on delete cascade)
router.delete('/owners/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ deleted: true });
});

// DELETE /api/auth/me  (self-service delete-my-account, any logged-in user)
router.delete('/me', requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(req.user.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ deleted: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
