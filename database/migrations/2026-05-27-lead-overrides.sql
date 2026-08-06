-- Leads synced from Aviontive API
CREATE TABLE IF NOT EXISTS leads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aviontive_lead_id     TEXT NOT NULL UNIQUE,
  brand_id              TEXT,
  pipeline_id           TEXT,
  stage_id              TEXT,
  conversation_id       TEXT,
  contact_id            TEXT,
  title                 TEXT,
  notes                 TEXT,
  source                TEXT,
  temperature           TEXT,
  stage_name            TEXT,
  stage_color           TEXT,
  stage_position        INTEGER,
  contact_full_name     TEXT,
  contact_email         TEXT,
  contact_phone         TEXT,
  channel_name          TEXT,
  external_display_name TEXT,
  last_message_at       TIMESTAMPTZ,
  labels                JSONB,
  raw_payload           JSONB,
  created_at_aviontive  TIMESTAMPTZ,
  updated_at_aviontive  TIMESTAMPTZ,
  last_synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_aviontive_lead_id ON leads(aviontive_lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_updated_at_aviontive ON leads(updated_at_aviontive DESC);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);

-- Lead overrides for lead actions on CRM leads screen
CREATE TABLE IF NOT EXISTS lead_overrides (
  lead_id           TEXT PRIMARY KEY,
  assigned_to       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_to_name  TEXT,
  note              TEXT,
  reminder_at       TIMESTAMPTZ,
  reminder_text     TEXT,
  updated_by        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lead_overrides_lead_id_fkey'
  ) THEN
    ALTER TABLE lead_overrides
      ADD CONSTRAINT lead_overrides_lead_id_fkey
      FOREIGN KEY (lead_id) REFERENCES leads(aviontive_lead_id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lead_overrides_assigned_to ON lead_overrides(assigned_to);
CREATE INDEX IF NOT EXISTS idx_lead_overrides_reminder_at ON lead_overrides(reminder_at);

DROP TRIGGER IF EXISTS trg_leads_updated_at ON leads;
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_lead_overrides_updated_at ON lead_overrides;
CREATE TRIGGER trg_lead_overrides_updated_at
  BEFORE UPDATE ON lead_overrides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
