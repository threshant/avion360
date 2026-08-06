-- Add call_id and pipeline_name to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS call_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS pipeline_name TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_call_id ON leads(call_id);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_id ON leads(pipeline_id);

-- Local pipeline management (replaces Aviontive dependency)
CREATE TABLE IF NOT EXISTS lead_pipelines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  brand_id    TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_pipelines_position ON lead_pipelines(position);

-- Local stage management per pipeline
CREATE TABLE IF NOT EXISTS lead_stages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES lead_pipelines(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_stages_pipeline_id ON lead_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_lead_stages_position ON lead_stages(position);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trg_lead_pipelines_updated_at ON lead_pipelines;
CREATE TRIGGER trg_lead_pipelines_updated_at
  BEFORE UPDATE ON lead_pipelines
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_lead_stages_updated_at ON lead_stages;
CREATE TRIGGER trg_lead_stages_updated_at
  BEFORE UPDATE ON lead_stages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed a default pipeline with common stages
INSERT INTO lead_pipelines (name, position) VALUES ('Default Pipeline', 0)
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  pipeline UUID;
BEGIN
  SELECT id INTO pipeline FROM lead_pipelines WHERE name = 'Default Pipeline' LIMIT 1;
  IF pipeline IS NOT NULL THEN
    INSERT INTO lead_stages (pipeline_id, name, color, position) VALUES
      (pipeline, 'New',       '#8b5cf6', 0),
      (pipeline, 'Contacted', '#3b82f6', 1),
      (pipeline, 'Qualified', '#f59e0b', 2),
      (pipeline, 'Proposal',  '#f97316', 3),
      (pipeline, 'Negotiation','#ef4444', 4),
      (pipeline, 'Won',       '#22c55e', 5),
      (pipeline, 'Lost',      '#6b7280', 6)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
