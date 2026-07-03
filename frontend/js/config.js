// Anon key is designed to be public (Supabase's RLS is what protects data —
// and our tables have RLS enabled with no policies, so anon key alone can't
// read/write them; it's only used here for Supabase Auth login/password-set).
const CONFIG = {
  SUPABASE_URL: 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: 'your_anon_public_key',
  // Must match backend .env APP_API_KEY. Not a real secret (it's shipped to
  // the browser) — just a lightweight anti-spam gate on the public
  // request-access endpoint.
  APP_API_KEY: 'change_this_to_anything'
};
