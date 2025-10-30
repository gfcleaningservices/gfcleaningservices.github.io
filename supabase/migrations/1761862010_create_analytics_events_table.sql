-- Migration: create_analytics_events_table
-- Created at: 1761862010

-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  page_url TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  browser_version TEXT,
  os TEXT,
  country TEXT,
  city TEXT,
  session_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  event_type TEXT DEFAULT 'page_view',
  duration_seconds INTEGER
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor_id ON analytics_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_page_url ON analytics_events(page_url);
CREATE INDEX IF NOT EXISTS idx_analytics_events_device_type ON analytics_events(device_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_browser ON analytics_events(browser);

-- RLS policies: Allow anonymous inserts (from tracking script) and reads
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert events (from tracking script)
CREATE POLICY "Allow anonymous insert" ON analytics_events
  FOR INSERT
  WITH CHECK (auth.role() IN ('anon', 'service_role'));

-- Allow anyone to read events (dashboard will use anon key)
CREATE POLICY "Allow read access" ON analytics_events
  FOR SELECT
  USING (auth.role() IN ('anon', 'service_role'));;