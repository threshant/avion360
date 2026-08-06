-- ============================================================
-- Cash Collection / Payments Module
-- Run this in your Supabase SQL editor
-- ============================================================

-- ── 1. Payments table ─────────────────────────────────────────────────────────
--   invoice_id IS NULL  → on-account / advance payment (credit to client account)
--   invoice_id NOT NULL → payment allocated against a specific invoice
CREATE TABLE IF NOT EXISTS payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  invoice_id   TEXT REFERENCES invoices(id) ON DELETE SET NULL,
  amount       NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mode         TEXT NOT NULL DEFAULT 'Cash'
                 CHECK (mode IN ('Cash','Bank Transfer','UPI','Cheque','Other')),
  reference    TEXT,
  notes        TEXT,
  status       TEXT NOT NULL DEFAULT 'Completed'
                 CHECK (status IN ('Completed','Reversed')),
  created_by   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_client_id   ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id  ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date        ON payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status      ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_client_date ON payments(client_id, payment_date DESC);

-- ── 2. Auto-update updated_at trigger ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_payments_updated_at();

-- ── 3. Invoices: cumulative paid amount (non-destructive) ─────────────────────
--   Tracks how much has been collected so cumulative overpayment can be
--   rejected at the row level (backstop; the stored function is the guard).

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  ALTER TABLE invoices ADD CONSTRAINT invoices_paid_amount_not_over_total
    CHECK (paid_amount >= 0 AND paid_amount <= total_amount);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 4. Invoices: add 'Partially Paid' to status (drop + re-add check) ─────────
--   Data is untouched. Existing workflow statuses (Pending/Draft/Sent/Overdue)
--   remain; payments auto-set 'Partially Paid' / 'Paid'.

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('Paid','Partially Paid','Pending','Draft','Sent','Overdue','Cancelled'));

-- ── 5. record_payment(p) — atomic, race-safe payment recording ────────────────
--   One transaction. Locks the invoice row and verifies cumulative total, so
--   concurrent payments can never overpay. Also writes an Income row to the
--   finance `transactions` table so the Finance screen reflects receipts.
--   On-account payments (invoice_id NULL) set is_credit = true (cash-balance
--   credit); invoice-linked payments set is_credit = false.
--   Transaction ids use 'PAY-' + payment uuid: guaranteed unique and traceable
--   back to the payment (avoids colliding with count-based TXN### ids).

CREATE OR REPLACE FUNCTION record_payment(
  p_client_id    UUID,
  p_invoice_id   TEXT,
  p_amount       NUMERIC,
  p_payment_date DATE,
  p_mode         TEXT,
  p_reference    TEXT,
  p_notes        TEXT,
  p_created_by   TEXT
) RETURNS payments AS $$
DECLARE
  v_payment  payments;
  v_party    TEXT;
  v_txn_id   TEXT;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  SELECT COALESCE(NULLIF(name, ''), NULLIF(company, ''), p_client_id::TEXT)
    INTO v_party
    FROM clients
   WHERE id = p_client_id;

  IF v_party IS NULL THEN
    RAISE EXCEPTION 'Client % not found', p_client_id;
  END IF;

  IF p_invoice_id IS NULL THEN
    -- ── On-account / advance payment ───────────────────────────────────────
    INSERT INTO payments (client_id, invoice_id, amount, payment_date, mode,
                          reference, notes, status, created_by)
    VALUES (p_client_id, NULL, p_amount, COALESCE(p_payment_date, CURRENT_DATE),
            p_mode, p_reference, p_notes, 'Completed', p_created_by)
    RETURNING * INTO v_payment;

    v_txn_id := 'PAY-' || v_payment.id;
    INSERT INTO transactions (id, type, party, amount, date, status, details,
                              invoice_id, is_credit)
    VALUES (v_txn_id, 'Income', v_party, p_amount,
            COALESCE(p_payment_date, CURRENT_DATE), 'Completed',
            COALESCE(p_notes, 'On-account payment via ' || p_mode),
            NULL, true);

    RETURN v_payment;
  END IF;

  -- ── Payment against an invoice ───────────────────────────────────────────
  -- Single guarded UPDATE locks the invoice row for the duration of the
  -- statement; only one concurrent transaction can pass the balance check.
  UPDATE invoices
     SET paid_amount = paid_amount + p_amount,
         status = CASE WHEN paid_amount + p_amount >= total_amount
                       THEN 'Paid' ELSE 'Partially Paid' END,
         updated_at = NOW()
   WHERE id = p_invoice_id
     AND client_id = p_client_id
     AND status NOT IN ('Draft','Cancelled')
     AND paid_amount + p_amount <= total_amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment of % exceeds the remaining balance on invoice % (or the invoice is Draft/Cancelled).',
      p_amount, p_invoice_id;
  END IF;

  INSERT INTO payments (client_id, invoice_id, amount, payment_date, mode,
                        reference, notes, status, created_by)
  VALUES (p_client_id, p_invoice_id, p_amount, COALESCE(p_payment_date, CURRENT_DATE),
          p_mode, p_reference, p_notes, 'Completed', p_created_by)
  RETURNING * INTO v_payment;

  v_txn_id := 'PAY-' || v_payment.id;
  INSERT INTO transactions (id, type, party, amount, date, status, details,
                            invoice_id, is_credit)
  VALUES (v_txn_id, 'Income', v_party, p_amount,
          COALESCE(p_payment_date, CURRENT_DATE), 'Completed',
          COALESCE(p_notes, 'Payment ' || p_mode || ' against ' || p_invoice_id),
          p_invoice_id, false);

  RETURN v_payment;
END $$ LANGUAGE plpgsql;

-- ── 6. Grants (match service-role usage of other tables) ─────────────────────

GRANT ALL ON payments TO postgres, anon, authenticated, service_role;
