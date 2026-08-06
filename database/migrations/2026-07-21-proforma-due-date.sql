-- Add due_date column to proforma_invoices (default 7 days from date of issue)
ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS due_date DATE;

-- Backfill existing proformas: due_date = date + 7 days where due_date is null
UPDATE proforma_invoices SET due_date = (date + INTERVAL '7 days')::DATE WHERE due_date IS NULL;
