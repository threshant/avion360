-- ============================================================
-- Payslip salary breakdown, auto employee ID, attendance summary
-- ============================================================

-- 1. Detailed salary breakdown columns on payroll_records
ALTER TABLE public.payroll_records
  ADD COLUMN IF NOT EXISTS basic_salary      NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hra               NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_allowances  NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS professional_tax  NUMERIC(12,2) NOT NULL DEFAULT 208,
  ADD COLUMN IF NOT EXISTS lop_days          NUMERIC(5,2)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lop_deduction     NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_deductions  NUMERIC(12,2) NOT NULL DEFAULT 0;

-- 2. Auto-generate employee_code on users (sequence + trigger)
CREATE SEQUENCE IF NOT EXISTS public.employee_code_seq START 1;

CREATE OR REPLACE FUNCTION public.auto_generate_employee_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.employee_code IS NULL OR trim(NEW.employee_code) = '' THEN
    NEW.employee_code := 'EMP' || LPAD(nextval('public.employee_code_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_employee_code ON public.users;
CREATE TRIGGER trg_auto_employee_code
  BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_employee_code();

-- Backfill existing users that have no employee_code
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id FROM public.users
    WHERE employee_code IS NULL OR trim(employee_code) = ''
    ORDER BY created_at ASC
  LOOP
    UPDATE public.users
    SET employee_code = 'EMP' || LPAD(nextval('public.employee_code_seq')::TEXT, 3, '0')
    WHERE id = rec.id;
  END LOOP;
END $$;

-- 3. Monthly attendance summary (populated by Excel upload)
CREATE TABLE IF NOT EXISTS public.attendance_monthly_summary (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  month         TEXT        NOT NULL,  -- YYYY-MM
  present_days  NUMERIC(5,2) NOT NULL DEFAULT 0,
  absent_days   NUMERIC(5,2) NOT NULL DEFAULT 0,
  half_days     NUMERIC(5,2) NOT NULL DEFAULT 0,
  leave_days    NUMERIC(5,2) NOT NULL DEFAULT 0,
  holiday_days  NUMERIC(5,2) NOT NULL DEFAULT 0,
  weekly_off    NUMERIC(5,2) NOT NULL DEFAULT 0,
  not_marked    NUMERIC(5,2) NOT NULL DEFAULT 0,
  overtime_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  lop_days      NUMERIC(5,2) NOT NULL DEFAULT 0,
  source        TEXT DEFAULT 'manual',  -- 'excel_upload' | 'manual'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT attendance_monthly_summary_user_month_unique UNIQUE (user_id, month),
  CONSTRAINT attendance_monthly_summary_month_check CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
);

CREATE INDEX IF NOT EXISTS idx_att_monthly_summary_user
  ON public.attendance_monthly_summary(user_id);
CREATE INDEX IF NOT EXISTS idx_att_monthly_summary_month
  ON public.attendance_monthly_summary(month);
