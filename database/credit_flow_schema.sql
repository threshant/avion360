-- ─────────────────────────────────────────────────────────────────────────────
-- Credit Flow — run this in your Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Add is_credit flag to transactions ─────────────────────────────────────
--    Marks a transaction as a manual "cash balance" credit entry.

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS is_credit BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_transactions_is_credit ON transactions(is_credit);

-- ── 2. Ensure system_settings table exists ────────────────────────────────────
--    (already exists if you ran schema.sql + Aviontive setup)

CREATE TABLE IF NOT EXISTS system_settings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT        NOT NULL UNIQUE,
  value       TEXT        NOT NULL,
  type        TEXT        NOT NULL DEFAULT 'string'
                CHECK (type IN ('string', 'number', 'boolean')),
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. Seed the credit_flow_enabled setting (default ON) ─────────────────────

INSERT INTO system_settings (key, value, type, description)
VALUES (
  'credit_flow_enabled',
  'true',
  'boolean',
  'When true, manual cash-balance credits appear in Finance totals and transaction history. Super-admin only.'
)
ON CONFLICT (key) DO NOTHING;
