-- Unify staff details under users and add detailed profile/salary/payment fields
-- Safe to run multiple times

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

-- Deactivate legacy staff permission entries to avoid separate staff menu/options
UPDATE public.permissions
SET is_active = false,
    updated_at = NOW()
WHERE key LIKE 'staff.%';
