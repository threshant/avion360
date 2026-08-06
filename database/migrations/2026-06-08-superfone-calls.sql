-- Superfone webhook: calls storage

CREATE TABLE IF NOT EXISTS calls (
  id                        BIGSERIAL PRIMARY KEY,
  superfone_cdr_id          BIGINT UNIQUE,
  event                     TEXT NOT NULL,
  superfone_number          TEXT,
  organization_name         TEXT,

  -- CDR fields
  cdr_disposition           TEXT,
  cdr_duration              INTEGER,
  cdr_call_type             TEXT,
  cdr_start                 TIMESTAMPTZ,
  cdr_answer                TIMESTAMPTZ,
  cdr_end                   TIMESTAMPTZ,
  cdr_phone                 TEXT,
  cdr_ringing_duration      INTEGER,
  cdr_recording_url         TEXT,
  cdr_recording_status      TEXT,

  -- Contact fields
  contact_id                BIGINT,
  contact_first_name        TEXT,
  contact_last_name         TEXT,
  contact_phones            JSONB DEFAULT '[]'::jsonb,
  contact_source            TEXT,
  contact_source_type       TEXT,
  contact_lead_stage_id     BIGINT,
  contact_lead_stage_name   TEXT,
  contact_lead_group_id     BIGINT,
  contact_lead_group_name   TEXT,
  contact_labels            JSONB DEFAULT '[]'::jsonb,
  contact_products          JSONB DEFAULT '[]'::jsonb,
  contact_assignee_user_id  BIGINT,
  contact_business_name     TEXT,
  contact_additional_info   TEXT,
  contact_emails            JSONB DEFAULT '[]'::jsonb,

  -- Task fields
  task_id                   BIGINT,
  task_type                 TEXT,
  task_status               TEXT,

  -- Staff fields
  staff_first_name          TEXT,
  staff_last_name           TEXT,
  staff_phone               TEXT,

  -- Contact/task update tracking
  updated_key               TEXT,
  updated_value             JSONB,

  -- Mapped display fields (denormalized for the CRM calls page)
  caller_name               TEXT,
  company                   TEXT,
  phone                     TEXT,
  temperature               TEXT CHECK (temperature IN ('hot', 'warm', 'cold') OR temperature IS NULL),
  call_type                 TEXT NOT NULL DEFAULT 'answered',
  status                    TEXT NOT NULL DEFAULT 'Completed',
  ivr_option                TEXT,
  assigned_to_name          TEXT,
  assigned_to_user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  duration_seconds          INTEGER DEFAULT 0,
  recording_url             TEXT,
  notes                     TEXT,

  raw_payload               JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calls_cdr_start ON calls (cdr_start DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_calls_contact_id ON calls (contact_id);
CREATE INDEX IF NOT EXISTS idx_calls_call_type ON calls (call_type);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls (status);
CREATE INDEX IF NOT EXISTS idx_calls_phone ON calls (phone);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls (created_at DESC);

-- Audit log for every webhook payload (including non-CDR events)
CREATE TABLE IF NOT EXISTS superfone_webhook_events (
  id              BIGSERIAL PRIMARY KEY,
  event           TEXT NOT NULL,
  superfone_cdr_id BIGINT,
  contact_id      BIGINT,
  payload         JSONB NOT NULL,
  processed       BOOLEAN NOT NULL DEFAULT FALSE,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_superfone_webhook_events_created_at
  ON superfone_webhook_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_superfone_webhook_events_cdr_id
  ON superfone_webhook_events (superfone_cdr_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_calls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calls_updated_at ON calls;
CREATE TRIGGER trg_calls_updated_at
  BEFORE UPDATE ON calls
  FOR EACH ROW
  EXECUTE FUNCTION update_calls_updated_at();

-- RLS: service role bypasses; authenticated users can read calls
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE superfone_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read calls" ON calls;
CREATE POLICY "Authenticated users can read calls"
  ON calls FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role full access on calls" ON calls;
CREATE POLICY "Service role full access on calls"
  ON calls FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on webhook events" ON superfone_webhook_events;
CREATE POLICY "Service role full access on webhook events"
  ON superfone_webhook_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON calls TO authenticated;
GRANT ALL ON calls TO service_role;
GRANT ALL ON superfone_webhook_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE calls_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE superfone_webhook_events_id_seq TO service_role;
