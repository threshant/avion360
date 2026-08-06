-- Multi-tenant foundation
-- 1) Organizations + memberships
-- 2) tenant_id on all existing business tables

DO $$ BEGIN
  CREATE TYPE membership_role_enum AS ENUM ('owner', 'admin', 'staff');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan_tier TEXT NOT NULL DEFAULT 'starter',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);

CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
