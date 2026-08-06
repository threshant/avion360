-- Financial Features Migration
-- Run this in your Supabase SQL editor

-- ── Proforma Invoices ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proforma_invoices (
  id            TEXT PRIMARY KEY,
  client_id     UUID REFERENCES clients(id),
  subtotal      NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_rate      NUMERIC(5,2)  NOT NULL DEFAULT 18,
  gst_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  date          DATE          NOT NULL,
  valid_until   DATE,
  status        TEXT          NOT NULL DEFAULT 'Draft'
                CHECK (status IN ('Draft','Sent','Accepted','Rejected','Expired','Converted')),
  notes         TEXT,
  quotation_id  TEXT REFERENCES quotations(id),
  created_by    TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proforma_invoice_items (
  id                 BIGSERIAL PRIMARY KEY,
  proforma_id        TEXT NOT NULL REFERENCES proforma_invoices(id) ON DELETE CASCADE,
  product            TEXT,
  description        TEXT NOT NULL,
  quantity           NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit_price         NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount             NUMERIC(12,2) NOT NULL DEFAULT 0,
  service_type       TEXT CHECK (service_type IN ('product_sourcing','logistics','trip','other')),
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Vendors (Accounts Payable) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  company      TEXT,
  email        TEXT,
  phone        TEXT,
  address      TEXT,
  gst_number   TEXT,
  pan_number   TEXT,
  bank_name    TEXT,
  bank_account TEXT,
  ifsc_code    TEXT,
  payment_terms INTEGER DEFAULT 30,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_bills (
  id             TEXT PRIMARY KEY,
  vendor_id      UUID NOT NULL REFERENCES vendors(id),
  amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  bill_date      DATE          NOT NULL,
  due_date       DATE,
  status         TEXT          NOT NULL DEFAULT 'Unpaid'
                 CHECK (status IN ('Unpaid','Paid','Partial','Overdue','Cancelled')),
  category       TEXT          CHECK (category IN ('Maintenance','Vendor Payment','Administrative','Logistics','Utilities','Other')),
  description    TEXT,
  payment_date   DATE,
  payment_ref    TEXT,
  created_by     TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Bank Accounts ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_accounts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name   TEXT NOT NULL,
  bank_name      TEXT NOT NULL,
  account_number TEXT NOT NULL,
  ifsc_code      TEXT,
  account_type   TEXT DEFAULT 'Current' CHECK (account_type IN ('Current','Savings','OD')),
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_statements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id  UUID NOT NULL REFERENCES bank_accounts(id),
  date             DATE NOT NULL,
  description      TEXT,
  debit            NUMERIC(12,2) DEFAULT 0,
  credit           NUMERIC(12,2) DEFAULT 0,
  balance          NUMERIC(14,2),
  reference_no     TEXT,
  transaction_id   TEXT REFERENCES transactions(id),
  is_reconciled    BOOLEAN NOT NULL DEFAULT FALSE,
  reconciled_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
