ALTER TABLE proforma_invoice_items
  ADD COLUMN IF NOT EXISTS product TEXT;
