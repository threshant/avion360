ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS shipping_address TEXT;
