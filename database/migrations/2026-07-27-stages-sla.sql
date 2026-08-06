-- ============================================================
-- Add SLA support to pipeline stages
-- ============================================================

-- Add SLA duration (in hours) to lead_stages
ALTER TABLE lead_stages ADD COLUMN IF NOT EXISTS sla_hours INTEGER;

-- Track when a lead entered its current stage
ALTER TABLE leads ADD COLUMN IF NOT EXISTS stage_entered_at TIMESTAMPTZ;

-- Backfill stage_entered_at with updated_at for existing leads
UPDATE leads SET stage_entered_at = updated_at WHERE stage_entered_at IS NULL;

-- Add index for SLA queries
CREATE INDEX IF NOT EXISTS idx_leads_stage_entered_at ON leads(stage_entered_at);
