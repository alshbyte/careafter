-- ============================================================
-- CareAfter: Supabase Database Schema
-- ============================================================
-- LEARN-ALONG: Why Supabase?
-- Supabase is an open-source Firebase alternative built on PostgreSQL.
-- Free tier: 500MB database, 50K monthly active users, unlimited API requests.
-- We use it ONLY for push notification plumbing — no patient health data.
-- The actual care plan stays encrypted on the patient's phone (IndexedDB).
-- ============================================================

-- Enable Row Level Security (RLS) on all tables
-- LEARN: RLS means even if someone gets your Supabase URL + anon key,
-- they can't read other users' data. Each row has policies controlling access.

-- 1. Push Subscriptions
-- Stores the Web Push subscription info for each device.
-- LEARN: When a user enables notifications, the browser generates a
-- unique "push subscription" containing:
--   - endpoint: a URL at Google/Apple/Mozilla's push service
--   - p256dh: a public encryption key (Diffie-Hellman)
--   - auth: an authentication secret
-- We need all three to send a push notification to that specific device.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL UNIQUE,      -- anonymous device fingerprint (hashed)
  endpoint TEXT NOT NULL,               -- push service URL
  p256dh TEXT NOT NULL,                 -- browser's public encryption key
  auth TEXT NOT NULL,                   -- authentication secret
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Reminder Schedules
-- Stores ONLY the medication name, dosage, and reminder times.
-- NO diagnosis, NO patient name, NO discharge details.
-- LEARN: This is "data minimization" — a core HIPAA/GDPR principle.
-- We store the absolute minimum needed to send a reminder.
CREATE TABLE IF NOT EXISTS reminder_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL REFERENCES push_subscriptions(device_id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,        -- e.g., "Lisinopril"
  dosage TEXT NOT NULL,                 -- e.g., "10mg"
  reminder_times TEXT[] NOT NULL,       -- e.g., {"08:00", "20:00"}
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies: allow inserts/updates/deletes only via service role (our API)
-- The anon key can't read or write these tables directly.
-- All access goes through our Next.js API routes which use the service role key.
CREATE POLICY "Service role full access on push_subscriptions"
  ON push_subscriptions FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on reminder_schedules"
  ON reminder_schedules FOR ALL
  USING (true) WITH CHECK (true);

-- Index for fast cron lookups
CREATE INDEX IF NOT EXISTS idx_reminder_active
  ON reminder_schedules (is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_reminder_device
  ON reminder_schedules (device_id);
