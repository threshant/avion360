-- ============================================================
-- TeleCMI integration: migrate calls table from Superfone
-- Run after 2026-06-08-superfone-calls.sql
-- ============================================================

-- 1. Add TeleCMI-specific columns to the existing calls table
--    (keeping superfone_cdr_id for backward compat in case rows exist)

ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS telecmi_cmiuuid       TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS direction             TEXT CHECK (direction IN ('inbound', 'outbound') OR direction IS NULL),
  ADD COLUMN IF NOT EXISTS virtual_number        TEXT,
  ADD COLUMN IF NOT EXISTS waitedsec             INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hangup_reason         TEXT,
  ADD COLUMN IF NOT EXISTS voicemail_enabled     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS voicename             TEXT,
  ADD COLUMN IF NOT EXISTS team_name             TEXT,
  ADD COLUMN IF NOT EXISTS ivr_name              TEXT,
  ADD COLUMN IF NOT EXISTS telecmi_agent         TEXT,
  ADD COLUMN IF NOT EXISTS billedsec             INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS telecmi_request_id    TEXT;

-- 2. Index on telecmi_cmiuuid for fast upserts
CREATE INDEX IF NOT EXISTS idx_calls_telecmi_cmiuuid
  ON calls (telecmi_cmiuuid);

CREATE INDEX IF NOT EXISTS idx_calls_direction
  ON calls (direction);

-- 3. TeleCMI webhook events audit log (replaces superfone_webhook_events)
CREATE TABLE IF NOT EXISTS telecmi_webhook_events (
  id              BIGSERIAL PRIMARY KEY,
  event_type      TEXT NOT NULL,                    -- 'cdr' or 'event'
  direction       TEXT,                             -- 'inbound' / 'outbound'
  status          TEXT,                             -- 'missed' / 'answered' etc.
  cmiuuid         TEXT,
  appid           BIGINT,
  payload         JSONB NOT NULL,
  processed       BOOLEAN NOT NULL DEFAULT FALSE,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telecmi_webhook_events_created_at
  ON telecmi_webhook_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_telecmi_webhook_events_cmiuuid
  ON telecmi_webhook_events (cmiuuid);

-- 4. Live events table — stores ringing/active calls for the dashboard
--    notification banner. TTL-cleaned by the webhook handler.
CREATE TABLE IF NOT EXISTS telecmi_live_events (
  id              BIGSERIAL PRIMARY KEY,
  cmiuuid         TEXT NOT NULL UNIQUE,
  direction       TEXT,                   -- 'inbound' / 'outbound'
  status          TEXT,                   -- 'ringing' / 'answered' / 'hangup'
  from_number     TEXT,
  to_number       TEXT,
  virtual_number  TEXT,
  agent           TEXT,
  appid           BIGINT,
  payload         JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telecmi_live_events_status
  ON telecmi_live_events (status);

CREATE INDEX IF NOT EXISTS idx_telecmi_live_events_created_at
  ON telecmi_live_events (created_at DESC);

-- 5. RLS policies for new tables

ALTER TABLE telecmi_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE telecmi_live_events    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on telecmi webhook events" ON telecmi_webhook_events;
CREATE POLICY "Service role full access on telecmi webhook events"
  ON telecmi_webhook_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on telecmi live events" ON telecmi_live_events;
CREATE POLICY "Service role full access on telecmi live events"
  ON telecmi_live_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can read telecmi live events" ON telecmi_live_events;
CREATE POLICY "Authenticated users can read telecmi live events"
  ON telecmi_live_events FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can update calls assigned_to" ON calls;
CREATE POLICY "Authenticated users can update calls assigned_to"
  ON calls FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT ALL  ON telecmi_webhook_events TO service_role;
GRANT ALL  ON telecmi_live_events    TO service_role;
GRANT SELECT ON telecmi_live_events  TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE telecmi_webhook_events_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE telecmi_live_events_id_seq    TO service_role;
