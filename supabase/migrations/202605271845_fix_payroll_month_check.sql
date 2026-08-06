-- Fix payroll month check constraint: PostgreSQL regex does not support \d digit class.
-- Also enforce month range 01..12.

-- Normalize one-digit months to zero-padded format before adding strict check.
UPDATE public.payroll_records
SET month = regexp_replace(month, '^([0-9]{4})-([0-9])$', '\\1-0\\2')
WHERE month ~ '^[0-9]{4}-[0-9]$';

ALTER TABLE public.payroll_records
DROP CONSTRAINT IF EXISTS payroll_records_month_check;

ALTER TABLE public.payroll_records
ADD CONSTRAINT payroll_records_month_check
CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
