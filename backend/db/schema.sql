-- LOCALPulse schema: multi-tenant with real Postgres Row-Level Security.
-- Tenancy model: every business row is owned by exactly one user (owner_id).
-- Admins (role = 'admin') bypass tenant isolation. Owners only ever see
-- their own rows because RLS enforces it at the database layer, not just
-- in application code.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('admin', 'owner')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS businesses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  address          TEXT,
  yelp_id          TEXT,
  google_place_id  TEXT,
  cached_data      JSONB,           -- last fetched Yelp + Google payload
  cached_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Row Level Security ----------
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs  ENABLE ROW LEVEL SECURITY;

-- The app sets these two session variables per-request (see middleware/auth.js):
--   app.current_user_id  -> the logged-in user's UUID
--   app.current_role     -> 'admin' or 'owner'
-- Admins see everything; owners only see rows where businesses.owner_id
-- matches their own id.

CREATE POLICY businesses_tenant_isolation ON businesses
  USING (
    current_setting('app.current_role', true) = 'admin'
    OR owner_id = current_setting('app.current_user_id', true)::uuid
  )
  WITH CHECK (
    current_setting('app.current_role', true) = 'admin'
    OR owner_id = current_setting('app.current_user_id', true)::uuid
  );

CREATE POLICY chat_logs_tenant_isolation ON chat_logs
  USING (
    current_setting('app.current_role', true) = 'admin'
    OR business_id IN (
      SELECT id FROM businesses
      WHERE owner_id = current_setting('app.current_user_id', true)::uuid
    )
  )
  WITH CHECK (
    current_setting('app.current_role', true) = 'admin'
    OR business_id IN (
      SELECT id FROM businesses
      WHERE owner_id = current_setting('app.current_user_id', true)::uuid
    )
  );

CREATE INDEX IF NOT EXISTS idx_businesses_owner ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_business ON chat_logs(business_id);
