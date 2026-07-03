const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('WARNING: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — Supabase calls will fail.');
}

// Service-role client: full DB access (bypasses RLS) + auth admin API
// (createUser, inviteUserByEmail, deleteUser, listUsers). Backend-only —
// never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

module.exports = { supabaseAdmin };
