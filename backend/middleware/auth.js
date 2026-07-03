const { supabaseAdmin } = require('../db/supabase');

// Verifies the Supabase Auth access token the frontend got from
// supabase.auth.signInWithPassword(). No custom JWT signing/secret needed —
// Supabase already signs and verifies these tokens for us.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Invalid or expired token' });

  const u = data.user;
  req.user = {
    id: u.id,
    email: u.email,
    role: u.user_metadata?.role || 'business_owner',
    name: u.user_metadata?.name || null
  };
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden - insufficient role' });
    }
    next();
  };
}

// Lightweight anti-spam gate for PUBLIC endpoints only (e.g. request-access).
// Not real security — APP_API_KEY ships to the browser. It just filters bots.
function requireAppKey(req, res, next) {
  const key = req.headers['x-app-key'];
  if (!process.env.APP_API_KEY || key !== process.env.APP_API_KEY) {
    return res.status(401).json({ error: 'Missing or invalid app key' });
  }
  next();
}

module.exports = { requireAuth, requireRole, requireAppKey };
