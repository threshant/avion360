-- ─────────────────────────────────────────────────────────────────
-- CRM Database Schema — run this in your Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────
-- Updated at timestamps for all tables
-- Enums for business types and other statuses

CREATE TYPE business_type_enum AS ENUM ('Manufacturer', 'Distributor', 'Retailer', 'Trader', 'Other');

-- ── User Roles Enum ────────────────────────────────────────────────
CREATE TYPE user_role_enum AS ENUM ('super_admin', 'admin', 'team_lead', 'employee', 'new_user');

-- ── Permission Grant Type Enum ────────────────────────────────────
CREATE TYPE permission_grant_enum AS ENUM ('grant', 'deny');

-- ── Users ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
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

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ── Roles (RBAC) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL UNIQUE,
  description    TEXT,
  is_system      BOOLEAN NOT NULL DEFAULT false,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_roles_name ON roles(name);

-- ── Permissions (RBAC) ──────────────────────────────────────────────
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

CREATE INDEX idx_permissions_key ON permissions(key);
CREATE INDEX idx_permissions_category ON permissions(category);
CREATE INDEX idx_permissions_order ON permissions(order_num);

-- ── Role Permissions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id        UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id  UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- ── User Permissions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_permissions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id  UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  grant_type     permission_grant_enum NOT NULL DEFAULT 'grant',
  assigned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, permission_id, grant_type)
);

CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_permission_id ON user_permissions(permission_id);

-- ── Clients ──────────────────────────────────────────────────────
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

-- ── Warehouse ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS warehouses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL UNIQUE,
  location     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Staff ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Inventory Items ───────────────────────────────────────────────
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
                        CHECK (status IN ('In Stock','Out for Delivery','Processing','Reserved','Out of Stock')),
  received_date       DATE,
  expected_delivery   DATE,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Stock Maintenance ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_maintenance (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  previous_quantity INTEGER NOT NULL,
  new_quantity      INTEGER NOT NULL,
  change_reason     TEXT NOT NULL,
  changed_by        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Invoices ──────────────────────────────────────────────────────
--itemid and itemname inventory item id refer
CREATE TABLE IF NOT EXISTS invoices (
  id           TEXT PRIMARY KEY,
  client_id    UUID REFERENCES clients(id) ON DELETE SET NULL,
  subtotal     NUMERIC(14, 2) NOT NULL DEFAULT 0,
  gst_rate     NUMERIC(5, 2) NOT NULL DEFAULT 18,
  gst_amount   NUMERIC(14, 2) NOT NULL DEFAULT 0,
  discount_percentage NUMERIC(5, 2) DEFAULT 0,
  discount_amount     NUMERIC(14, 2) DEFAULT 0,
  tds_rate NUMERIC(5, 2) DEFAULT 0,
  tds_amount NUMERIC(14, 2) DEFAULT 0,
  tcs_rate NUMERIC(5, 2) DEFAULT 0,
  tcs_amount NUMERIC(14, 2) DEFAULT 0,
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  date         DATE NOT NULL,
  due_date     DATE NOT NULL,
  status       TEXT NOT NULL DEFAULT 'Draft'
                 CHECK (status IN ('Paid','Pending','Draft','Sent','Overdue','Cancelled')),
  notes        TEXT,
  created_by   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Invoice Line Items ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_price  NUMERIC(14, 2) NOT NULL DEFAULT 0,
  amount      NUMERIC(14, 2) NOT NULL DEFAULT 0
);

-- ── Quotations ────────────────────────────────────────────────────
-- References inventory items
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
                     CHECK (status IN ('Pending','Accepted','Draft','Rejected','Expired')),
  notes            TEXT,
  created_by       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Quotation Line Items ──────────────────────────────────────────
-- References both quotations and inventory items
CREATE TABLE IF NOT EXISTS quotation_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id     UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  inventory_item_id TEXT REFERENCES inventory_items(id) ON DELETE SET NULL,
  product          TEXT,
  description      TEXT NOT NULL,
  quantity         NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_price       NUMERIC(14, 2) NOT NULL DEFAULT 0,
  amount           NUMERIC(14, 2) NOT NULL DEFAULT 0
);

-- ── Leads (synced from Aviontive) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aviontive_lead_id    TEXT NOT NULL UNIQUE,
  brand_id             TEXT,
  pipeline_id          TEXT,
  stage_id             TEXT,
  conversation_id      TEXT,
  contact_id           TEXT,
  title                TEXT,
  notes                TEXT,
  source               TEXT,
  temperature          TEXT,
  stage_name           TEXT,
  stage_color          TEXT,
  stage_position       INTEGER,
  contact_full_name    TEXT,
  contact_email        TEXT,
  contact_phone        TEXT,
  channel_id           TEXT,
  channel_name         TEXT,
  external_display_name TEXT,
  last_message_at      TIMESTAMPTZ,
  labels               JSONB,
  raw_payload          JSONB,
  avionbox_event_id    TEXT,
  avionbox_event_type  TEXT,
  avionbox_source      TEXT,
  avionbox_message_id  TEXT,
  is_new_conversation  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at_aviontive TIMESTAMPTZ,
  updated_at_aviontive TIMESTAMPTZ,
  last_synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_aviontive_lead_id ON leads(aviontive_lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_updated_at_aviontive ON leads(updated_at_aviontive DESC);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_conversation_id ON leads(conversation_id);
CREATE INDEX IF NOT EXISTS idx_leads_avionbox_event_id ON leads(avionbox_event_id) WHERE avionbox_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_avionbox_message_id ON leads(avionbox_message_id) WHERE avionbox_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_channel_id ON leads(channel_id) WHERE channel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_channel_name ON leads(channel_name) WHERE channel_name IS NOT NULL;

-- ── Lead Overrides (for Aviontive lead actions) ─────────────────────────────
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

-- ── Updated At Auto-Trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_warehouses_updated_at
  BEFORE UPDATE ON warehouses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_quotations_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_lead_overrides_updated_at
  BEFORE UPDATE ON lead_overrides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Multi-tenant Foundation ─────────────────────────────────────────

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
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role membership_role_enum NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE stock_maintenance ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE lead_overrides ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_roles_tenant_id ON roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_permissions_tenant_id ON permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_tenant_id ON role_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_tenant_id ON user_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_tenant_id ON warehouses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_tenant_id ON staff(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant_id ON inventory_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_maintenance_tenant_id ON stock_maintenance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_tenant_id ON invoice_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotations_tenant_id ON quotations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_tenant_id ON quotation_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_overrides_tenant_id ON lead_overrides(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);