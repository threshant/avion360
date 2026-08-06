-- =============================================================================
-- SOURCERSBIZ CRM — COMPLETE DATABASE SETUP (FINAL)
-- =============================================================================
-- Includes EVERYTHING from database/*.sql and supabase/migrations/*.sql:
--   schema.sql, all migrations, sample-data.sql, finance_reports_schema.sql,
--   credit_flow_schema.sql, financial_features, invoice TDS/TCS, OTP/MSG91 seeds.
--
-- Demo logins (dev):
--   super.admin@crm.demo / Super@123
--   admin@crm.demo       / Admin@123
--   employee@crm.demo    / Employee@123
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. EXTENSIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ENUMS
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE business_type_enum AS ENUM (
    'Manufacturer', 'Distributor', 'Retailer', 'Trader', 'Other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_role_enum AS ENUM (
    'super_admin', 'admin', 'team_lead', 'employee', 'new_user'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE permission_grant_enum AS ENUM ('grant', 'deny');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE txn_type_enum AS ENUM ('Income', 'Expense', 'Commission');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE txn_status_enum AS ENUM ('Completed', 'Pending', 'Processing');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE report_category_enum AS ENUM (
    'Sales', 'Leads', 'Calls', 'Finance', 'Inventory', 'HR'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CORE TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- Users (password_hash nullable for Google OAuth users)
CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT,
  role           user_role_enum NOT NULL DEFAULT 'employee',
  phone          TEXT,
  telecmi_user_id TEXT,
  designation    TEXT,
  department     TEXT,
  avatar_url     TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  last_login     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

-- RBAC
CREATE TABLE IF NOT EXISTS roles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL UNIQUE,
  description    TEXT,
  is_system      BOOLEAN NOT NULL DEFAULT false,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

CREATE TABLE IF NOT EXISTS permissions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key            TEXT NOT NULL UNIQUE,
  label          TEXT NOT NULL,
  description    TEXT,
  category       TEXT,
  icon           TEXT,
  path           TEXT,
  order_num      INTEGER DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permissions_key ON permissions(key);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
CREATE INDEX IF NOT EXISTS idx_permissions_order ON permissions(order_num);

CREATE TABLE IF NOT EXISTS role_permissions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id        UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id  UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

CREATE TABLE IF NOT EXISTS user_permissions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id  UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  grant_type     permission_grant_enum NOT NULL DEFAULT 'grant',
  assigned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, permission_id, grant_type)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_grant_type ON user_permissions(grant_type);

CREATE TABLE IF NOT EXISTS revoked_user_permissions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id  UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  revoked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_revoked_user_permissions_user_id
  ON revoked_user_permissions(user_id);

-- Clients & logistics
CREATE TABLE IF NOT EXISTS clients (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  email          TEXT,
  phone          TEXT,
  company        TEXT,
  address        TEXT,
  gst_number     TEXT,
  business_type  business_type_enum,
  gst_rate       NUMERIC(5, 2) DEFAULT 18,
  gst_available  BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL UNIQUE,
  location     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id                  TEXT PRIMARY KEY,
  client_id           UUID REFERENCES clients(id) ON DELETE SET NULL,
  commodity           TEXT NOT NULL,
  description         TEXT,
  cbm                 NUMERIC(10, 2) NOT NULL DEFAULT 0,
  quantity            INTEGER NOT NULL DEFAULT 0,
  unit                TEXT,
  packing             TEXT NOT NULL,
  warehouse_id        UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  warehouse_location  TEXT,
  staff_id            UUID REFERENCES staff(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'In Stock'
                        CHECK (status IN (
                          'In Stock','Out for Delivery','Processing',
                          'Reserved','Out of Stock'
                        )),
  received_date       DATE,
  expected_delivery   DATE,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_maintenance (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  previous_quantity INTEGER NOT NULL,
  new_quantity      INTEGER NOT NULL,
  change_reason     TEXT NOT NULL,
  changed_by        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invoicing
CREATE TABLE IF NOT EXISTS invoices (
  id                  TEXT PRIMARY KEY,
  client_id           UUID REFERENCES clients(id) ON DELETE SET NULL,
  subtotal            NUMERIC(14, 2) NOT NULL DEFAULT 0,
  gst_rate            NUMERIC(5, 2) NOT NULL DEFAULT 18,
  gst_amount          NUMERIC(14, 2) NOT NULL DEFAULT 0,
  discount_percentage NUMERIC(5, 2) DEFAULT 0,
  discount_amount     NUMERIC(14, 2) DEFAULT 0,
  tds_rate            NUMERIC(5, 2) DEFAULT 0,
  tds_amount          NUMERIC(14, 2) DEFAULT 0,
  tcs_rate            NUMERIC(5, 2) DEFAULT 0,
  tcs_amount          NUMERIC(14, 2) DEFAULT 0,
  total_amount        NUMERIC(14, 2) NOT NULL DEFAULT 0,
  date                DATE NOT NULL,
  due_date            DATE NOT NULL,
  status              TEXT NOT NULL DEFAULT 'Draft'
                        CHECK (status IN (
                          'Paid','Pending','Draft','Sent','Overdue','Cancelled'
                        )),
  notes               TEXT,
  created_by          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_price  NUMERIC(14, 2) NOT NULL DEFAULT 0,
  amount      NUMERIC(14, 2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quotations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number TEXT,
  client_id        UUID REFERENCES clients(id) ON DELETE SET NULL,
  subtotal         NUMERIC(14, 2) NOT NULL DEFAULT 0,
  gst_rate         NUMERIC(5, 2) NOT NULL DEFAULT 18,
  gst_amount       NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_amount     NUMERIC(14, 2) NOT NULL DEFAULT 0,
  date             DATE NOT NULL,
  valid_until      DATE NOT NULL,
  status           TEXT NOT NULL DEFAULT 'Draft'
                     CHECK (status IN (
                       'Pending','Accepted','Draft','Rejected','Expired'
                     )),
  notes            TEXT,
  created_by       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotation_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id      UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  inventory_item_id TEXT REFERENCES inventory_items(id) ON DELETE SET NULL,
  product          TEXT,
  description       TEXT NOT NULL,
  quantity          NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_price        NUMERIC(14, 2) NOT NULL DEFAULT 0,
  amount            NUMERIC(14, 2) NOT NULL DEFAULT 0
);

-- Proforma invoices (financial_features + discount/TDS/TCS split)
CREATE TABLE IF NOT EXISTS proforma_invoices (
  id                  TEXT PRIMARY KEY,
  client_id           UUID REFERENCES clients(id) ON DELETE SET NULL,
  subtotal            NUMERIC(12, 2) NOT NULL DEFAULT 0,
  gst_rate            NUMERIC(5, 2) NOT NULL DEFAULT 18,
  gst_amount          NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_percentage NUMERIC(5, 2) DEFAULT 0,
  discount_amount     NUMERIC(14, 2) DEFAULT 0,
  tds_rate            NUMERIC(5, 2) DEFAULT 0,
  tds_amount          NUMERIC(14, 2) DEFAULT 0,
  tcs_rate            NUMERIC(5, 2) DEFAULT 0,
  tcs_amount          NUMERIC(14, 2) DEFAULT 0,
  total_amount        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  date                DATE NOT NULL,
  valid_until         DATE,
  status              TEXT NOT NULL DEFAULT 'Draft'
                        CHECK (status IN (
                          'Draft','Sent','Accepted','Rejected','Expired','Converted'
                        )),
  notes               TEXT,
  quotation_id        UUID REFERENCES quotations(id) ON DELETE SET NULL,
  created_by          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proforma_invoice_items (
  id           BIGSERIAL PRIMARY KEY,
  proforma_id  TEXT NOT NULL REFERENCES proforma_invoices(id) ON DELETE CASCADE,
  product      TEXT,
  description  TEXT NOT NULL,
  quantity     NUMERIC(10, 3) NOT NULL DEFAULT 1,
  unit_price   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  amount       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  service_type TEXT CHECK (service_type IN (
    'product_sourcing', 'logistics', 'trip', 'other'
  )),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Finance
CREATE TABLE IF NOT EXISTS transactions (
  id          TEXT PRIMARY KEY,
  type        txn_type_enum NOT NULL,
  party       TEXT NOT NULL,
  amount      NUMERIC(14, 2) NOT NULL DEFAULT 0,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  status      txn_status_enum NOT NULL DEFAULT 'Pending',
  details     TEXT,
  invoice_id  TEXT REFERENCES invoices(id) ON DELETE SET NULL,
  is_credit   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice_id ON transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_transactions_is_credit ON transactions(is_credit);

CREATE TABLE IF NOT EXISTS reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  category    report_category_enum NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- Vendors & bank (financial_features)
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
  vendor_id      UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  amount         NUMERIC(12, 2) NOT NULL DEFAULT 0,
  gst_amount     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  bill_date      DATE NOT NULL,
  due_date       DATE,
  status         TEXT NOT NULL DEFAULT 'Unpaid'
                   CHECK (status IN (
                     'Unpaid','Paid','Partial','Overdue','Cancelled'
                   )),
  category       TEXT CHECK (category IN (
    'Maintenance','Vendor Payment','Administrative',
    'Logistics','Utilities','Other'
  )),
  description    TEXT,
  payment_date   DATE,
  payment_ref    TEXT,
  created_by     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name    TEXT NOT NULL,
  bank_name       TEXT NOT NULL,
  account_number  TEXT NOT NULL,
  ifsc_code       TEXT,
  account_type    TEXT DEFAULT 'Current'
                    CHECK (account_type IN ('Current','Savings','OD')),
  opening_balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_statements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id  UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  date             DATE NOT NULL,
  description      TEXT,
  debit            NUMERIC(12, 2) DEFAULT 0,
  credit           NUMERIC(12, 2) DEFAULT 0,
  balance          NUMERIC(14, 2),
  reference_no     TEXT,
  transaction_id   TEXT REFERENCES transactions(id) ON DELETE SET NULL,
  is_reconciled    BOOLEAN NOT NULL DEFAULT false,
  reconciled_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tasks (API uses service role; RLS disabled)
CREATE TABLE IF NOT EXISTS tasks (
  id           BIGSERIAL PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  type         VARCHAR(50) DEFAULT 'Other',
  priority     VARCHAR(20) DEFAULT 'Medium',
  status       VARCHAR(50) DEFAULT 'Pending',
  assigned_to  UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date     DATE,
  completed_at TIMESTAMPTZ,
  related_to   JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

-- Notifications (per-user app notifications)
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  category      TEXT NOT NULL CHECK (category IN ('task', 'lead', 'attendance', 'payroll')),
  event_type    TEXT NOT NULL,
  entity_type   TEXT,
  entity_id     TEXT,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata      JSONB,
  is_read       BOOLEAN NOT NULL DEFAULT false,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Leads synced from Aviontive API (source of truth for CRM leads screen)
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
  channel_id            TEXT,
  channel_name          TEXT,
  external_display_name TEXT,
  last_message_at       TIMESTAMPTZ,
  labels                JSONB,
  raw_payload           JSONB,
  avionbox_event_id     TEXT,
  avionbox_event_type   TEXT,
  avionbox_source       TEXT,
  avionbox_message_id   TEXT,
  is_new_conversation   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at_aviontive  TIMESTAMPTZ,
  updated_at_aviontive  TIMESTAMPTZ,
  last_synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_aviontive_lead_id ON leads(aviontive_lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_updated_at_aviontive ON leads(updated_at_aviontive DESC);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_conversation_id ON leads(conversation_id);
CREATE INDEX IF NOT EXISTS idx_leads_avionbox_event_id ON leads(avionbox_event_id) WHERE avionbox_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_avionbox_message_id ON leads(avionbox_message_id) WHERE avionbox_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_channel_id ON leads(channel_id) WHERE channel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_channel_name ON leads(channel_name) WHERE channel_name IS NOT NULL;

-- Lead overrides for Aviontive lead-level actions (assign, note, reminder)
CREATE TABLE IF NOT EXISTS lead_overrides (
  lead_id           TEXT PRIMARY KEY REFERENCES leads(aviontive_lead_id) ON DELETE CASCADE,
  assigned_to       UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to_name  TEXT,
  note              TEXT,
  reminder_at       TIMESTAMPTZ,
  reminder_text     TEXT,
  updated_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_overrides_assigned_to ON lead_overrides(assigned_to);
CREATE INDEX IF NOT EXISTS idx_lead_overrides_reminder_at ON lead_overrides(reminder_at);

-- System settings (Aviontive, credit flow, MSG91 OTP)
CREATE TABLE IF NOT EXISTS system_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  value       TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'string'
                CHECK (type IN ('string', 'number', 'boolean')),
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service role full access" ON system_settings;
CREATE POLICY "Allow service role full access" ON system_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. UPDATED_AT TRIGGER
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clients_updated_at ON clients;
CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_warehouses_updated_at ON warehouses;
CREATE TRIGGER trg_warehouses_updated_at
  BEFORE UPDATE ON warehouses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_staff_updated_at ON staff;
CREATE TRIGGER trg_staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_inventory_updated_at ON inventory_items;
CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_quotations_updated_at ON quotations;
CREATE TRIGGER trg_quotations_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_proforma_invoices_updated_at ON proforma_invoices;
CREATE TRIGGER trg_proforma_invoices_updated_at
  BEFORE UPDATE ON proforma_invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON transactions;
CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_reports_updated_at ON reports;
CREATE TRIGGER trg_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_vendors_updated_at ON vendors;
CREATE TRIGGER trg_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_vendor_bills_updated_at ON vendor_bills;
CREATE TRIGGER trg_vendor_bills_updated_at
  BEFORE UPDATE ON vendor_bills
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_bank_accounts_updated_at ON bank_accounts;
CREATE TRIGGER trg_bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_leads_updated_at ON leads;
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_lead_overrides_updated_at ON lead_overrides;
CREATE TRIGGER trg_lead_overrides_updated_at
  BEFORE UPDATE ON lead_overrides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. SEED — ROLES
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO roles (name, description, is_system, is_active) VALUES
  ('super_admin', 'Full system access', true, true),
  ('admin', 'Administrative access', true, true),
  ('team_lead', 'Team lead access', false, true),
  ('employee', 'Standard employee access', true, true),
  ('new_user', 'Awaiting admin approval', true, true)
ON CONFLICT (name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. SEED — PAGE PERMISSIONS (sidebar / app routes)
--     From: supabase/migrations/seed_page_permissions.sql
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO permissions (key, label, description, category, order_num, is_active)
VALUES
  ('dashboard.view', 'View Dashboard', 'Access to the main dashboard page', 'Core Access', 10, true),
  ('settings.view', 'View Settings', 'Access to the settings page', 'Core Access', 20, true),
  ('user_management.view', 'Manage All Users', 'User management (Super Admin)', 'Core Access', 30, true),
  ('leads.view', 'View Leads', 'Leads management page', 'Operations Access', 100, true),
  ('calls.view', 'View Calls', 'Calls log page', 'Operations Access', 110, true),
  ('clients.view', 'View Customers', 'Customers page', 'Operations Access', 120, true),
  ('staff.view', 'View Staff', 'Staff management page', 'Operations Access', 130, true),
  ('tasks.view', 'View Tasks', 'Tasks page', 'Operations Access', 140, true),
  ('reports.view', 'View Reports', 'Reports page', 'Operations Access', 150, true),
  ('inventory.view', 'View Inventory', 'Inventory page', 'Logistics Access', 200, true),
  ('stock_upload.view', 'View Stock Upload', 'Stock upload page', 'Logistics Access', 210, true),
  ('warehouse.view', 'View Warehouse', 'Warehouse page', 'Logistics Access', 220, true),
  ('invoices.view', 'View Invoicing', 'Invoices and quotations', 'Financial Access', 300, true),
  ('finance.view', 'View Finance', 'Finance page', 'Financial Access', 310, true),
  ('accounts.view', 'View Accounts', 'Accounts page', 'Financial Access', 320, true),
  ('financial_reports.view', 'View Financial Reports', 'Financial reports', 'Financial Access', 330, true),
  ('bank_reconciliation.view', 'View Bank Reconciliation', 'Bank reconciliation', 'Financial Access', 340, true),
  ('payroll.view', 'View Payroll', 'Payroll page', 'Financial Access', 350, true),
  ('attendance.view', 'View Attendance', 'Attendance page', 'Financial Access', 360, true),
  -- Granular CRUD (from database/sample-data.sql) for API-level checks
  ('clients.create', 'Create Client', 'Create clients', 'Clients', 1000, true),
  ('clients.edit', 'Edit Client', 'Edit clients', 'Clients', 1001, true),
  ('clients.delete', 'Delete Client', 'Delete clients', 'Clients', 1002, true),
  ('inventory.create', 'Create Inventory', 'Add inventory', 'Inventory', 1010, true),
  ('inventory.edit', 'Edit Inventory', 'Edit inventory', 'Inventory', 1011, true),
  ('inventory.delete', 'Delete Inventory', 'Delete inventory', 'Inventory', 1012, true),
  ('inventory.bulk_upload', 'Bulk Upload Inventory', 'Bulk upload', 'Inventory', 1013, true),
  ('invoices.create', 'Create Invoice', 'Create invoices', 'Invoices', 1020, true),
  ('invoices.edit', 'Edit Invoice', 'Edit invoices', 'Invoices', 1021, true),
  ('invoices.delete', 'Delete Invoice', 'Delete invoices', 'Invoices', 1022, true),
  ('quotations.view', 'View Quotations', 'View quotations', 'Quotations', 1030, true),
  ('quotations.create', 'Create Quotation', 'Create quotations', 'Quotations', 1031, true),
  ('quotations.edit', 'Edit Quotation', 'Edit quotations', 'Quotations', 1032, true),
  ('quotations.delete', 'Delete Quotation', 'Delete quotations', 'Quotations', 1033, true),
  ('quotations.convert', 'Convert Quotation', 'Convert to invoice', 'Quotations', 1034, true),
  ('leads.create', 'Create Lead', 'Create leads', 'Leads', 1040, true),
  ('leads.edit', 'Edit Lead', 'Edit leads', 'Leads', 1041, true),
  ('leads.delete', 'Delete Lead', 'Delete leads', 'Leads', 1042, true),
  ('warehouse.create', 'Create Warehouse', 'Create warehouses', 'Warehouse', 1050, true),
  ('warehouse.edit', 'Edit Warehouse', 'Edit warehouses', 'Warehouse', 1051, true),
  ('warehouse.delete', 'Delete Warehouse', 'Delete warehouses', 'Warehouse', 1052, true),
  ('staff.create', 'Create Staff', 'Add staff', 'Staff', 1060, true),
  ('staff.edit', 'Edit Staff', 'Edit staff', 'Staff', 1061, true),
  ('staff.delete', 'Delete Staff', 'Delete staff', 'Staff', 1062, true),
  ('users.view', 'View Users', 'View users', 'Users', 1070, true),
  ('users.create', 'Create User', 'Create users', 'Users', 1071, true),
  ('users.edit', 'Edit User', 'Edit users', 'Users', 1072, true),
  ('users.delete', 'Delete User', 'Delete users', 'Users', 1073, true),
  ('reports.export', 'Export Reports', 'Export reports', 'Reports', 1080, true),
  ('settings.edit', 'Edit Settings', 'Edit settings', 'Settings', 1090, true),
  ('rbac.manage', 'Manage RBAC', 'Manage roles and permissions', 'RBAC', 1091, true)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  order_num = EXCLUDED.order_num,
  is_active = EXCLUDED.is_active;

-- Super admin role → all active permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin' AND p.is_active = true
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Admin role → common write access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN (
  'dashboard.view','settings.view','leads.view','calls.view','clients.view',
  'staff.view','tasks.view','reports.view','inventory.view','stock_upload.view',
  'warehouse.view','invoices.view','finance.view','accounts.view',
  'financial_reports.view','bank_reconciliation.view',
  'clients.create','clients.edit','inventory.create','inventory.edit',
  'inventory.bulk_upload','invoices.view','invoices.create','invoices.edit',
  'quotations.view','quotations.create','quotations.edit','quotations.convert',
  'leads.create','leads.edit','warehouse.view','warehouse.create','warehouse.edit',
  'staff.view','staff.create','staff.edit','users.view','users.create','users.edit',
  'reports.export','settings.view'
)
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Team lead role (from database/sample-data.sql)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN (
  'dashboard.view','clients.view','inventory.view','inventory.create','inventory.edit',
  'invoices.view','invoices.create','quotations.view','quotations.create','quotations.convert',
  'leads.view','leads.create','leads.edit','warehouse.view','staff.view','reports.view',
  'tasks.view','calls.view'
)
WHERE r.name = 'team_lead'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Employee role → read + limited create
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN (
  'dashboard.view','leads.view','clients.view','inventory.view','inventory.create',
  'invoices.view','quotations.view','quotations.create','leads.create',
  'warehouse.view','reports.view','tasks.view','calls.view'
)
WHERE r.name = 'employee'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. SEED — DEMO USERS (bcrypt via pgcrypto)
--     From: database/migrations/2026-05-06-fix-demo-password-hashes.sql
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO users (name, email, password_hash, role, designation, department, phone, is_active)
VALUES
  ('Super Admin User', 'super.admin@crm.demo', crypt('Super@123', gen_salt('bf')), 'super_admin', 'Chief Administrator', 'Administration', '919999999999', true),
  ('Admin User', 'admin@crm.demo', crypt('Admin@123', gen_salt('bf')), 'admin', 'Manager', 'Operations', '918888888888', true),
  ('Team Lead User', 'team.lead@crm.demo', crypt('Admin@123', gen_salt('bf')), 'team_lead', 'Team Lead', 'Sales', '917777777777', true),
  ('Employee One', 'employee@crm.demo', crypt('Employee@123', gen_salt('bf')), 'employee', 'Sales Executive', 'Sales', '916666666666', true),
  ('Employee Two', 'employee2@crm.demo', crypt('Employee@123', gen_salt('bf')), 'employee', 'Inventory Specialist', 'Warehouse', '915555555555', true)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  is_active = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. SEED — SYSTEM SETTINGS
--     Aviontive, credit flow, MSG91 OTP (disabled by default)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO system_settings (key, value, type, description) VALUES
  ('AVIONTIVE_API_KEY', '', 'string', 'Aviontive API Key'),
  ('AVIONTIVE_BRAND_ID', '', 'string', 'Aviontive Brand ID'),
  ('AVIONTIVE_API_BASE_URL', 'https://box.aviontive.com/api', 'string', 'Aviontive API Base URL'),
  ('credit_flow_enabled', 'true', 'boolean', 'Manual cash-balance credits in Finance'),
  ('otp_login_enabled', 'false', 'boolean', 'Phone OTP login on sign-in page'),
  ('MSG91_AUTH_KEY', '', 'string', 'MSG91 authentication key'),
  ('MSG91_TEMPLATE_ID', '', 'string', 'MSG91 OTP template ID'),
  ('MSG91_OTP_LENGTH', '6', 'number', 'OTP digit length'),
  ('MSG91_OTP_EXPIRY', '5', 'number', 'OTP expiry in minutes')
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. SEED — SAMPLE BUSINESS DATA (full database/sample-data.sql + finance seeds)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO clients (name, email, phone, company, address, gst_number, business_type, gst_rate, gst_available)
SELECT v.name, v.email, v.phone, v.company, v.address, v.gst_number, v.business_type::business_type_enum, v.gst_rate, v.gst_available
FROM (VALUES
  ('Acme Manufacturing Ltd', 'contact@acme.com', '+91-9876543210', 'Acme Manufacturing', '123 Industrial Park, Mumbai', '27AABCU1234F1Z0', 'Manufacturer', 18::numeric, true),
  ('Global Distributors Inc', 'sales@globaldist.com', '+91-9988776655', 'Global Distributors', '456 Trade Center, Bangalore', '29AABCD5678G2Z5', 'Distributor', 18::numeric, true),
  ('Metro Retail Solutions', 'info@metroretail.com', '+91-8765432109', 'Metro Retail', '789 Shopping Complex, Delhi', '07AABCR1234H3Z0', 'Retailer', 9::numeric, true),
  ('TechTrade Enterprises', 'contact@techtrade.in', '+91-7654321098', 'TechTrade Corp', '321 Tech Hub, Hyderabad', '36AABCT5678I4Z2', 'Trader', 18::numeric, true),
  ('Premium Goods Co', 'hello@premiumgoods.com', '+91-6543210987', 'Premium Goods', '654 Premium Plaza, Pune', '27AABCX9876J5Z3', 'Other', 5::numeric, false)
) AS v(name, email, phone, company, address, gst_number, business_type, gst_rate, gst_available)
WHERE NOT EXISTS (SELECT 1 FROM clients c WHERE c.name = v.name);

INSERT INTO warehouses (name, location) VALUES
  ('Mumbai Main Warehouse', 'Dockyard Area, Mumbai'),
  ('Delhi Distribution Center', 'CHHD Gurgaon, Delhi'),
  ('Bangalore Storage Facility', 'Electronics City, Bangalore'),
  ('Chennai Port Warehouse', 'Port Area, Chennai')
ON CONFLICT (name) DO NOTHING;

INSERT INTO staff (name, warehouse_id)
SELECT v.name, w.id
FROM (VALUES
  ('Rajesh Kumar', 'Mumbai Main Warehouse'),
  ('Priya Nair', 'Mumbai Main Warehouse'),
  ('Amit Singh', 'Delhi Distribution Center'),
  ('Sunitha Reddy', 'Bangalore Storage Facility'),
  ('Mohammed Hassan', 'Chennai Port Warehouse')
) AS v(name, warehouse_name)
JOIN warehouses w ON w.name = v.warehouse_name
WHERE NOT EXISTS (SELECT 1 FROM staff s WHERE s.name = v.name);

INSERT INTO inventory_items (id, client_id, commodity, description, cbm, quantity, unit, packing, warehouse_id, status, received_date)
SELECT v.id, c.id, v.commodity, v.description, v.cbm, v.quantity, v.unit, v.packing, w.id, v.status, v.received_date::date
FROM (VALUES
  ('INV-STEEL-001', 'Acme Manufacturing Ltd', 'Steel Coils', 'Hot Rolled Coils 2mm', 15.5, 150, 'pieces', 'Wooden Pallets', 'Mumbai Main Warehouse', 'In Stock', '2026-03-15'),
  ('INV-ELEC-002', 'Global Distributors Inc', 'Electronics', 'USB Cables Type C', 2.3, 5000, 'pieces', 'Cardboard Boxes', 'Delhi Distribution Center', 'In Stock', '2026-03-10'),
  ('INV-TEXT-003', 'Metro Retail Solutions', 'Textiles', 'Cotton Fabric Roll', 8.7, 200, 'rolls', 'Plastic Wrap', 'Bangalore Storage Facility', 'In Stock', '2026-03-08'),
  ('INV-CHEM-004', 'TechTrade Enterprises', 'Chemicals', 'Industrial Cleaner Bulk', 12.4, 500, 'liters', 'Plastic Containers', 'Chennai Port Warehouse', 'In Stock', '2026-03-05'),
  ('INV-MACH-005', 'Premium Goods Co', 'Machinery', 'Motor Pumps 5HP', 5.2, 25, 'pieces', 'Wooden Crates', 'Mumbai Main Warehouse', 'In Stock', '2026-03-01')
) AS v(id, client_name, commodity, description, cbm, quantity, unit, packing, warehouse_name, status, received_date)
JOIN clients c ON c.name = v.client_name
JOIN warehouses w ON w.name = v.warehouse_name
ON CONFLICT (id) DO NOTHING;

INSERT INTO invoices (id, client_id, subtotal, gst_rate, gst_amount, total_amount, date, due_date, status, notes, created_by)
SELECT v.id, c.id, v.subtotal, v.gst_rate, v.gst_amount, v.total_amount, v.date::date, v.due_date::date, v.status, v.notes, v.created_by
FROM (VALUES
  ('INV-2026-001', 'Acme Manufacturing Ltd', 50000, 18, 9000, 59000, '2026-03-20', '2026-04-20', 'Pending', 'Steel coil shipment invoice', 'admin@crm.demo'),
  ('INV-2026-002', 'Global Distributors Inc', 25000, 18, 4500, 29500, '2026-03-18', '2026-04-18', 'Paid', 'Electronics bulk order', 'admin@crm.demo'),
  ('INV-2026-003', 'Metro Retail Solutions', 15000, 9, 1350, 16350, '2026-03-15', '2026-04-15', 'Draft', 'Textile fabrics - pending approval', 'employee@crm.demo')
) AS v(id, client_name, subtotal, gst_rate, gst_amount, total_amount, date, due_date, status, notes, created_by)
JOIN clients c ON c.name = v.client_name
ON CONFLICT (id) DO NOTHING;

INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount)
SELECT v.invoice_id, v.description, v.quantity, v.unit_price, v.amount
FROM (VALUES
  ('INV-2026-001', 'Steel Coils - Hot Rolled 2mm', 150, 333.33, 50000),
  ('INV-2026-002', 'USB Cables Type C - Bulk Pack', 500, 50, 25000),
  ('INV-2026-003', 'Cotton Fabric Roll - Premium', 200, 75, 15000)
) AS v(invoice_id, description, quantity, unit_price, amount)
WHERE EXISTS (SELECT 1 FROM invoices i WHERE i.id = v.invoice_id)
  AND NOT EXISTS (
    SELECT 1 FROM invoice_items ii
    WHERE ii.invoice_id = v.invoice_id AND ii.description = v.description
  );

INSERT INTO quotations (quotation_number, client_id, subtotal, gst_rate, gst_amount, total_amount, date, valid_until, status, notes, created_by)
SELECT v.quotation_number, c.id, v.subtotal, v.gst_rate, v.gst_amount, v.total_amount, v.date::date, v.valid_until::date, v.status, v.notes, v.created_by
FROM (VALUES
  ('QUOTE-2026-001', 'Acme Manufacturing Ltd', 75000, 18, 13500, 88500, '2026-03-20', '2026-04-20', 'Pending', 'Quotation for large order negotiation', 'admin@crm.demo'),
  ('QUOTE-2026-002', 'TechTrade Enterprises', 40000, 18, 7200, 47200, '2026-03-19', '2026-04-19', 'Accepted', 'Ready to convert to invoice', 'admin@crm.demo')
) AS v(quotation_number, client_name, subtotal, gst_rate, gst_amount, total_amount, date, valid_until, status, notes, created_by)
JOIN clients c ON c.name = v.client_name
WHERE NOT EXISTS (
  SELECT 1 FROM quotations q WHERE q.quotation_number = v.quotation_number
);

INSERT INTO quotation_items (quotation_id, inventory_item_id, description, quantity, unit_price, amount)
SELECT q.id, v.inventory_item_id, v.description, v.quantity, v.unit_price, v.amount
FROM (VALUES
  ('QUOTE-2026-001', 'INV-STEEL-001', 'Steel Coils - Hot Rolled 2mm', 225, 333.33, 75000),
  ('QUOTE-2026-002', 'INV-MACH-005', 'Motor Pumps 5HP - Premium Series', 40, 1000, 40000)
) AS v(quotation_number, inventory_item_id, description, quantity, unit_price, amount)
JOIN quotations q ON q.quotation_number = v.quotation_number
WHERE NOT EXISTS (
    SELECT 1 FROM quotation_items qi
    WHERE qi.quotation_id = q.id AND qi.description = v.description
  );

-- Full transaction + report seeds (database/finance_reports_schema.sql)
INSERT INTO transactions (id, type, party, amount, date, status, details, invoice_id) VALUES
  ('TXN001', 'Income', 'Reliance Industries Ltd', 450000, '2024-02-15', 'Completed', 'Ref: INV-2024-001', NULL),
  ('TXN002', 'Expense', 'Office Supplies Pvt Ltd', 32000, '2024-02-14', 'Completed', 'Office Expenses', NULL),
  ('TXN003', 'Income', 'Tata Consultancy Services', 670000, '2024-02-13', 'Pending', 'Ref: INV-2024-002', NULL),
  ('TXN004', 'Commission', 'Mahindra Trade Co', 350000, '2024-02-12', 'Pending', 'Bill: CN-2024-012 · Commission: ₹35,000 · Payable: ₹3,15,000', NULL),
  ('TXN005', 'Expense', 'Warehouse Rent', 85000, '2024-02-10', 'Completed', 'Office Expenses', NULL),
  ('TXN006', 'Income', 'Infosys Ltd', 520000, '2024-02-08', 'Completed', 'Ref: INV-2024-003', NULL),
  ('TXN007', 'Commission', 'Bajaj Auto Suppliers', 180000, '2024-02-07', 'Processing', 'Bill: CN-2024-011 · Commission: ₹18,000 · Payable: ₹1,62,000', NULL),
  ('TXN008', 'Expense', 'IT Infrastructure Ltd', 120000, '2024-02-05', 'Completed', 'Equipment', NULL),
  ('TXN009', 'Income', 'Wipro Technologies', 390000, '2024-02-04', 'Pending', 'Ref: INV-2024-004', NULL),
  ('TXN010', 'Expense', 'Utilities Board', 40500, '2024-02-03', 'Completed', 'Rent & Utilities', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO reports (title, category)
SELECT v.title, v.category::report_category_enum
FROM (VALUES
  ('Sales Performance Report', 'Sales'),
  ('Lead Conversion Analysis', 'Leads'),
  ('Call Activity Report', 'Calls'),
  ('Monthly Revenue Summary', 'Finance'),
  ('Inventory Stock Report', 'Inventory'),
  ('HR Attendance Summary', 'HR')
) AS v(title, category)
WHERE NOT EXISTS (SELECT 1 FROM reports r WHERE r.title = v.title);

-- =============================================================================
-- 8. LATEST HR/USER UNIFICATION UPDATES
-- =============================================================================

-- Extended user profile and salary/payment fields
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS employee_code TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS joining_date DATE,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS salary_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS salary_currency TEXT DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS salary_type TEXT DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS payment_frequency TEXT DEFAULT 'Monthly',
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Bank Transfer',
  ADD COLUMN IF NOT EXISTS bank_account_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_ifsc TEXT,
  ADD COLUMN IF NOT EXISTS upi_id TEXT,
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_salary_type_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_salary_type_check
      CHECK (salary_type IS NULL OR salary_type IN ('monthly', 'hourly', 'annual', 'contract'));
  END IF;
END $$;

-- Deactivate legacy staff permissions in favor of users-based staff directory
UPDATE public.permissions
SET is_active = false,
    updated_at = NOW()
WHERE key LIKE 'staff.%';

-- Attendance records mapped directly to users
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  entry_time TIME,
  exit_time TIME,
  working_hours NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'Present',
  device_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT attendance_records_status_check
    CHECK (status IN ('Present', 'Late', 'Absent', 'Half Day', 'On Leave')),
  CONSTRAINT attendance_records_user_date_unique UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_user_id
  ON public.attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date
  ON public.attendance_records(date);

-- Payroll records mapped directly to users
CREATE TABLE IF NOT EXISTS public.payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  overtime NUMERIC(12,2) NOT NULL DEFAULT 0,
  bonus NUMERIC(12,2) NOT NULL DEFAULT 0,
  allowances NUMERIC(12,2) NOT NULL DEFAULT 0,
  deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'Pending',
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payroll_records_month_check CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT payroll_records_payment_status_check
    CHECK (payment_status IN ('Paid', 'Pending', 'Processing', 'On Hold')),
  CONSTRAINT payroll_records_user_month_unique UNIQUE (user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_payroll_records_user_id
  ON public.payroll_records(user_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_month
  ON public.payroll_records(month);

-- =============================================================================
-- DONE. Verify with:
--   SELECT table_name FROM information_schema.tables
--     WHERE table_schema = 'public' ORDER BY 1;
-- =============================================================================

-- =============================================================================
-- 9. MULTI-TENANT FOUNDATION
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE membership_role_enum AS ENUM ('owner', 'admin', 'staff');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan_tier TEXT NOT NULL DEFAULT 'starter',
  industry TEXT,
  team_size INTEGER CHECK (team_size IS NULL OR team_size > 0),
  company_website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
CREATE INDEX IF NOT EXISTS idx_organizations_industry ON organizations(industry);

CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role membership_role_enum NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_tenant_id ON memberships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_memberships_role ON memberships(role);

DO $$
DECLARE
  tbl TEXT;
  target_tables TEXT[] := ARRAY[
    'users',
    'roles',
    'permissions',
    'role_permissions',
    'user_permissions',
    'revoked_user_permissions',
    'clients',
    'warehouses',
    'staff',
    'inventory_items',
    'stock_maintenance',
    'invoices',
    'invoice_items',
    'quotations',
    'quotation_items',
    'proforma_invoices',
    'proforma_invoice_items',
    'transactions',
    'reports',
    'vendors',
    'vendor_bills',
    'bank_accounts',
    'bank_statements',
    'tasks',
    'notifications',
    'leads',
    'lead_overrides',
    'system_settings',
    'attendance_records',
    'attendance_monthly_summary',
    'payroll_records',
    'lead_kanban_columns',
    'lead_pipelines',
    'lead_stages',
    'calls',
    'superfone_webhook_events',
    'telecmi_webhook_events',
    'telecmi_live_events',
    'tickets',
    'ticket_comments',
    'expenses',
    'payments'
  ];
BEGIN
  FOREACH tbl IN ARRAY target_tables LOOP
    IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL',
        tbl
      );

      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%I_tenant_id ON public.%I(tenant_id)',
        tbl,
        tbl
      );
    END IF;
  END LOOP;
END $$;
