-- ============================================================
-- Expenses Module
-- Run this in your Supabase SQL editor
--   A dedicated `expenses` table with its own record/edit/delete
--   flow. Each expense also writes a 'type=Expense' row into the
--   finance `transactions` table so the Finance screen reflects it.
--   Transaction ids use 'EXP-' + expense uuid (no TXN### collision).
-- ============================================================

-- ── 1. Expenses table ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS expenses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category       TEXT NOT NULL
                   CHECK (category IN ('Rent & Utilities','Office Supplies',
                         'Equipment','Salaries','Travel','Marketing',
                         'Software & Subscriptions','Legal & Professional','Other')),
  party          TEXT NOT NULL,
  amount         NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  expense_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_mode   TEXT NOT NULL DEFAULT 'Cash'
                   CHECK (payment_mode IN ('Cash','Bank Transfer','UPI','Cheque','Other')),
  reference      TEXT,
  description    TEXT,
  status         TEXT NOT NULL DEFAULT 'Completed'
                   CHECK (status IN ('Completed','Reversed')),
  transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
  created_by     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_category    ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_party       ON expenses(party);
CREATE INDEX IF NOT EXISTS idx_expenses_date        ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_status      ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_txn         ON expenses(transaction_id);

-- ── 2. Auto-update updated_at trigger ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_expenses_updated_at ON expenses;
CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_expenses_updated_at();

-- ── 3. record_expense(p) — create an expense + finance transaction ────────────
--   One transaction: inserts the expense, writes the Income-opposite row
--   (type=Expense, is_credit=false) to `transactions`, then links it back.

CREATE OR REPLACE FUNCTION record_expense(
  p_category     TEXT,
  p_party        TEXT,
  p_amount       NUMERIC,
  p_expense_date DATE,
  p_payment_mode TEXT,
  p_reference    TEXT,
  p_description  TEXT,
  p_created_by   TEXT
) RETURNS expenses AS $$
DECLARE
  v_expense expenses;
  v_txn_id  TEXT;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Expense amount must be greater than zero';
  END IF;
  IF NULLIF(TRIM(p_party), '') IS NULL THEN
    RAISE EXCEPTION 'A party (paid to) must be specified';
  END IF;

  INSERT INTO expenses (category, party, amount, expense_date, payment_mode,
                        reference, description, status, created_by)
  VALUES (p_category, TRIM(p_party), p_amount, COALESCE(p_expense_date, CURRENT_DATE),
          p_payment_mode, p_reference, p_description, 'Completed', p_created_by)
  RETURNING * INTO v_expense;

  v_txn_id := 'EXP-' || v_expense.id;
  INSERT INTO transactions (id, type, party, amount, date, status, details, is_credit)
  VALUES (v_txn_id, 'Expense', TRIM(p_party), p_amount,
          COALESCE(p_expense_date, CURRENT_DATE), 'Completed',
          COALESCE(NULLIF(TRIM(p_description), ''),
                   p_category || ' expense' || CASE WHEN TRIM(p_party) <> ''
                     THEN ' — ' || TRIM(p_party) ELSE '' END),
          false);

  UPDATE expenses SET transaction_id = v_txn_id WHERE id = v_expense.id;
  v_expense.transaction_id := v_txn_id;

  RETURN v_expense;
END $$ LANGUAGE plpgsql;

-- ── 4. update_expense(p) — edit an expense + keep finance in sync ─────────────

CREATE OR REPLACE FUNCTION update_expense(
  p_expense_id   UUID,
  p_category     TEXT,
  p_party        TEXT,
  p_amount       NUMERIC,
  p_expense_date DATE,
  p_payment_mode TEXT,
  p_reference    TEXT,
  p_description  TEXT
) RETURNS expenses AS $$
DECLARE
  v_expense expenses;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Expense amount must be greater than zero';
  END IF;

  UPDATE expenses
     SET category = p_category,
         party = TRIM(p_party),
         amount = p_amount,
         expense_date = COALESCE(p_expense_date, expense_date),
         payment_mode = p_payment_mode,
         reference = p_reference,
         description = p_description
   WHERE id = p_expense_id
   RETURNING * INTO v_expense;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense % not found', p_expense_id;
  END IF;

  IF v_expense.transaction_id IS NOT NULL THEN
    UPDATE transactions
       SET party = TRIM(p_party),
           amount = p_amount,
           date = v_expense.expense_date,
           details = COALESCE(NULLIF(TRIM(p_description), ''),
                              p_category || ' expense' || CASE WHEN TRIM(p_party) <> ''
                                THEN ' — ' || TRIM(p_party) ELSE '' END)
     WHERE id = v_expense.transaction_id;
  END IF;

  RETURN v_expense;
END $$ LANGUAGE plpgsql;

-- ── 5. delete_expense(p) — remove expense + its finance transaction ───────────

CREATE OR REPLACE FUNCTION delete_expense(p_expense_id UUID)
RETURNS void AS $$
DECLARE
  v_txn_id TEXT;
BEGIN
  SELECT transaction_id INTO v_txn_id FROM expenses WHERE id = p_expense_id;

  IF v_txn_id IS NULL THEN
    RAISE EXCEPTION 'Expense % not found', p_expense_id;
  END IF;

  DELETE FROM expenses WHERE id = p_expense_id;
  DELETE FROM transactions WHERE id = v_txn_id;
END $$ LANGUAGE plpgsql;

-- ── 6. Grants (match service-role usage of other tables) ─────────────────────

GRANT ALL ON expenses TO postgres, anon, authenticated, service_role;
