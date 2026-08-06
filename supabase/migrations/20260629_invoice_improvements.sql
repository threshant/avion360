-- Invoice improvements: currency, tax type, HSN codes, signatory name
-- Run this migration in Supabase SQL editor

-- Add new columns to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_type text NOT NULL DEFAULT 'CGST_SGST';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS signatory_name text;

-- Add HSN/SAC code to invoice line items
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS hsn_code text;
