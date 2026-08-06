-- ============================================================
-- Avionbox webhook support for leads table
-- ============================================================

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS avionbox_event_id TEXT,
  ADD COLUMN IF NOT EXISTS avionbox_event_type TEXT,
  ADD COLUMN IF NOT EXISTS avionbox_source TEXT,
  ADD COLUMN IF NOT EXISTS avionbox_message_id TEXT,
  ADD COLUMN IF NOT EXISTS channel_id TEXT,
  ADD COLUMN IF NOT EXISTS channel_name TEXT,
  ADD COLUMN IF NOT EXISTS is_new_conversation BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_leads_conversation_id
  ON leads (conversation_id);

CREATE INDEX IF NOT EXISTS idx_leads_avionbox_event_id
  ON leads (avionbox_event_id)
  WHERE avionbox_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_avionbox_message_id
  ON leads (avionbox_message_id)
  WHERE avionbox_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_channel_id
  ON leads (channel_id)
  WHERE channel_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_channel_name
  ON leads (channel_name)
  WHERE channel_name IS NOT NULL;