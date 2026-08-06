-- ─────────────────────────────────────────────────────────────────────────────
-- Finance & Reports Schema — run this in your Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Transaction type and status enums ────────────────────────────────────────

CREATE TYPE txn_type_enum   AS ENUM ('Income', 'Expense', 'Commission');
CREATE TYPE txn_status_enum AS ENUM ('Completed', 'Pending', 'Processing');

-- ── Transactions ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS transactions (
  id          TEXT PRIMARY KEY,
  type        txn_type_enum   NOT NULL,
  party       TEXT            NOT NULL,
  amount      NUMERIC(14, 2)  NOT NULL DEFAULT 0,
  date        DATE            NOT NULL DEFAULT CURRENT_DATE,
  status      txn_status_enum NOT NULL DEFAULT 'Pending',
  details     TEXT,
  invoice_id  TEXT REFERENCES invoices(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_type       ON transactions(type);
CREATE INDEX idx_transactions_date       ON transactions(date DESC);
CREATE INDEX idx_transactions_status     ON transactions(status);
CREATE INDEX idx_transactions_invoice_id ON transactions(invoice_id);

CREATE OR REPLACE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Reports (saved / generated report records) ────────────────────────────────

CREATE TYPE report_category_enum AS ENUM ('Sales', 'Leads', 'Calls', 'Finance', 'Inventory', 'HR');

CREATE TABLE IF NOT EXISTS reports (
  id          UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT                 NOT NULL,
  category    report_category_enum NOT NULL,
  created_at  TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_category   ON reports(category);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);

CREATE OR REPLACE TRIGGER trg_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Sample data — replace with real records as needed
-- ─────────────────────────────────────────────────────────────────────────────

-- Transactions

INSERT INTO transactions (id, type, party, amount, date, status, details, invoice_id) VALUES
  ('TXN001', 'Income',     'Reliance Industries Ltd',   450000, '2024-02-15', 'Completed',  'Ref: INV-2024-001', NULL),
  ('TXN002', 'Expense',    'Office Supplies Pvt Ltd',    32000, '2024-02-14', 'Completed',  'Office Expenses',   NULL),
  ('TXN003', 'Income',     'Tata Consultancy Services', 670000, '2024-02-13', 'Pending',    'Ref: INV-2024-002', NULL),
  ('TXN004', 'Commission', 'Mahindra Trade Co',         350000, '2024-02-12', 'Pending',    'Bill: CN-2024-012 · Commission: ₹35,000 · Payable: ₹3,15,000', NULL),
  ('TXN005', 'Expense',    'Warehouse Rent',             85000, '2024-02-10', 'Completed',  'Office Expenses',   NULL),
  ('TXN006', 'Income',     'Infosys Ltd',               520000, '2024-02-08', 'Completed',  'Ref: INV-2024-003', NULL),
  ('TXN007', 'Commission', 'Bajaj Auto Suppliers',      180000, '2024-02-07', 'Processing', 'Bill: CN-2024-011 · Commission: ₹18,000 · Payable: ₹1,62,000', NULL),
  ('TXN008', 'Expense',    'IT Infrastructure Ltd',     120000, '2024-02-05', 'Completed',  'Equipment',         NULL),
  ('TXN009', 'Income',     'Wipro Technologies',        390000, '2024-02-04', 'Pending',    'Ref: INV-2024-004', NULL),
  ('TXN010', 'Expense',    'Utilities Board',            40500, '2024-02-03', 'Completed',  'Rent & Utilities',  NULL)
ON CONFLICT (id) DO NOTHING;

-- Reports

INSERT INTO reports (title, category) VALUES
  ('Sales Performance Report',  'Sales'),
  ('Lead Conversion Analysis',  'Leads'),
  ('Call Activity Report',      'Calls'),
  ('Monthly Revenue Summary',   'Finance'),
  ('Inventory Stock Report',    'Inventory'),
  ('HR Attendance Summary',     'HR')
ON CONFLICT DO NOTHING;
