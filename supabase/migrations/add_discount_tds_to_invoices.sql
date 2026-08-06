-- Migration to add discount and TDS/TCS fields to invoices
-- Run this in your Supabase SQL editor

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(14, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tds_tcs_rate NUMERIC(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tds_tcs_amount NUMERIC(14, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tds_tcs_type TEXT CHECK (tds_tcs_type IN ('TDS', 'TCS'));

-- Optional: Update proforma_invoices too if needed
ALTER TABLE proforma_invoices 
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(14, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tds_tcs_rate NUMERIC(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tds_tcs_amount NUMERIC(14, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tds_tcs_type TEXT CHECK (tds_tcs_type IN ('TDS', 'TCS'));
