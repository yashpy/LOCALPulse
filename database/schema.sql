-- ============================================================
-- LocalPulse Database Schema
-- Run this in your Supabase SQL Editor
-- supabase.com → your project → SQL Editor → New Query
-- ============================================================

-- Businesses table
CREATE TABLE businesses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT, -- e.g. "restaurant", "salon", "bar", "retail"
  address TEXT,
  owner_email TEXT NOT NULL,
  owner_phone TEXT,
  google_place_id TEXT,
  google_rating DECIMAL(2,1),
  google_review_count INT,
  yelp_id TEXT,
  yelp_rating DECIMAL(2,1),
  plan TEXT DEFAULT 'starter' CHECK (plan IN ('starter', 'growth', 'pro')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews cache table (so we don't hammer Google/Yelp APIs)
CREATE TABLE reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('google', 'yelp')),
  author TEXT,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT,
  review_time TIMESTAMPTZ,
  responded BOOLEAN DEFAULT false,
  ai_response TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insights reports table
CREATE TABLE insights_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  avg_rating DECIMAL(2,1),
  new_review_count INT,
  summary TEXT,
  top_insight TEXT,
  recommendation TEXT,
  promotion_idea TEXT,
  slowest_day TEXT,
  busiest_hour TEXT,
  estimated_foot_traffic INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SMS campaigns table
CREATE TABLE sms_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  recipients_count INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  trigger_type TEXT CHECK (trigger_type IN ('manual', 'slow_hours', 'scheduled')),
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Opted-in customers (for SMS campaigns)
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  opted_in BOOLEAN DEFAULT true,
  opted_in_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, phone)
);

-- Automation settings per business
CREATE TABLE automation_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  auto_respond_reviews BOOLEAN DEFAULT false,
  weekly_digest_email BOOLEAN DEFAULT true,
  slow_hours_sms BOOLEAN DEFAULT false,
  slow_hours_threshold INT DEFAULT 5, -- trigger if below X customers/hour
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS) — enable for production
-- ============================================================
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_campaigns ENABLE ROW LEVEL SECURITY;

-- For MVP: allow all ops via service key (backend only)
CREATE POLICY "Service role full access" ON businesses FOR ALL USING (true);
CREATE POLICY "Service role full access" ON reviews FOR ALL USING (true);
CREATE POLICY "Service role full access" ON insights_reports FOR ALL USING (true);
CREATE POLICY "Service role full access" ON sms_campaigns FOR ALL USING (true);
CREATE POLICY "Service role full access" ON customers FOR ALL USING (true);
CREATE POLICY "Service role full access" ON automation_settings FOR ALL USING (true);

-- ============================================================
-- Sample seed data for testing
-- ============================================================
INSERT INTO businesses (name, type, address, owner_email, google_rating, yelp_rating, plan) VALUES
  ('Casa Tempe', 'restaurant', '1 Mill Ave, Tempe, AZ 85281', 'owner@casatempe.com', 4.3, 4.0, 'growth'),
  ('Sun Devil Cuts', 'salon', '420 S Mill Ave, Tempe, AZ 85281', 'hello@sundevilcuts.com', 4.6, 4.5, 'starter'),
  ('Copper Tap Room', 'bar', '7 W 7th St, Tempe, AZ 85281', 'manager@coppertap.com', 4.1, 3.9, 'pro');
