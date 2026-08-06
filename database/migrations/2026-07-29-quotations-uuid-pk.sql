-- ─────────────────────────────────────────────────────────────────────
-- Migration: Switch quotations.id from TEXT sequential ID to UUID PK
-- Adds quotation_number column for human-readable display IDs (QUO-YYYY-NNN)
-- ─────────────────────────────────────────────────────────────────────

-- 1. Drop foreign key constraints referencing quotations.id
ALTER TABLE quotation_items
  DROP CONSTRAINT IF EXISTS quotation_items_quotation_id_fkey;

ALTER TABLE proforma_invoices
  DROP CONSTRAINT IF EXISTS proforma_invoices_quotation_id_fkey;

-- 2. Rename old id → quotation_number, add new UUID id column
ALTER TABLE quotations RENAME COLUMN id TO quotation_number;
ALTER TABLE quotations ADD COLUMN id UUID DEFAULT gen_random_uuid();

-- 3. Backfill UUIDs for existing rows
UPDATE quotations SET id = gen_random_uuid() WHERE id IS NULL;

-- 4. Make id the primary key
ALTER TABLE quotations ALTER COLUMN id SET NOT NULL;
ALTER TABLE quotations ADD PRIMARY KEY (id);

-- 5. Update quotation_items FK column type and data
ALTER TABLE quotation_items ADD COLUMN new_quotation_id UUID;
UPDATE quotation_items qi
  SET new_quotation_id = q.id
  FROM quotations q
  WHERE qi.quotation_id = q.quotation_number;
ALTER TABLE quotation_items DROP COLUMN quotation_id;
ALTER TABLE quotation_items RENAME COLUMN new_quotation_id TO quotation_id;
ALTER TABLE quotation_items ALTER COLUMN quotation_id SET NOT NULL;
ALTER TABLE quotation_items
  ADD CONSTRAINT quotation_items_quotation_id_fkey
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE;

-- 6. Update proforma_invoices FK column type and data
ALTER TABLE proforma_invoices ADD COLUMN new_quotation_id UUID;
UPDATE proforma_invoices pi
  SET new_quotation_id = q.id
  FROM quotations q
  WHERE pi.quotation_id = q.quotation_number;
ALTER TABLE proforma_invoices DROP COLUMN quotation_id;
ALTER TABLE proforma_invoices RENAME COLUMN new_quotation_id TO quotation_id;
ALTER TABLE proforma_invoices
  ADD CONSTRAINT proforma_invoices_quotation_id_fkey
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE SET NULL;
