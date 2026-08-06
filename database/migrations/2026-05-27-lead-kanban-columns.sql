CREATE TABLE IF NOT EXISTS lead_kanban_columns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  stage_name  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_kanban_columns_position
  ON lead_kanban_columns(position);

ALTER TABLE lead_overrides
  ADD COLUMN IF NOT EXISTS kanban_column_id UUID REFERENCES lead_kanban_columns(id) ON DELETE SET NULL;

DROP TRIGGER IF EXISTS trg_lead_kanban_columns_updated_at ON lead_kanban_columns;
CREATE TRIGGER trg_lead_kanban_columns_updated_at
  BEFORE UPDATE ON lead_kanban_columns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
