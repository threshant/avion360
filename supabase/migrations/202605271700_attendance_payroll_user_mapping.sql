-- Map attendance and payroll directly to users
-- Salary is sourced from users.salary_amount (configurable from user profile)

CREATE TABLE IF NOT EXISTS public.attendance_records (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  entry_time TIME,
  exit_time TIME,
  working_hours NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'Present',
  device_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT attendance_records_status_check
    CHECK (status IN ('Present', 'Late', 'Absent', 'Half Day', 'On Leave')),
  CONSTRAINT attendance_records_user_date_unique UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_user_id
  ON public.attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date
  ON public.attendance_records(date);

CREATE TABLE IF NOT EXISTS public.payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  overtime NUMERIC(12,2) NOT NULL DEFAULT 0,
  bonus NUMERIC(12,2) NOT NULL DEFAULT 0,
  allowances NUMERIC(12,2) NOT NULL DEFAULT 0,
  deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'Pending',
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payroll_records_month_check CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT payroll_records_payment_status_check
    CHECK (payment_status IN ('Paid', 'Pending', 'Processing', 'On Hold')),
  CONSTRAINT payroll_records_user_month_unique UNIQUE (user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_payroll_records_user_id
  ON public.payroll_records(user_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_month
  ON public.payroll_records(month);
