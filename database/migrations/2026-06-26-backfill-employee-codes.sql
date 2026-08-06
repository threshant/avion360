-- Backfill employee_code for all existing users who don't have one.
-- Safe to run multiple times — only touches rows where employee_code is NULL or blank.

-- 1. Ensure the sequence exists
CREATE SEQUENCE IF NOT EXISTS public.employee_code_seq START 1;

-- 2. Seed the sequence so it starts AFTER the highest existing numeric code
DO $$
DECLARE
  max_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(employee_code FROM 4) AS INTEGER)), 0)
    INTO max_num
    FROM public.users
   WHERE employee_code ~ '^EMP[0-9]+$';

  IF max_num > 0 THEN
    PERFORM setval('public.employee_code_seq', max_num);
  END IF;
END $$;

-- 3. Assign EMP001, EMP002 … to every user missing a code (ordered by created_at)
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id
      FROM public.users
     WHERE employee_code IS NULL OR trim(employee_code) = ''
     ORDER BY created_at ASC
  LOOP
    UPDATE public.users
       SET employee_code = 'EMP' || LPAD(nextval('public.employee_code_seq')::TEXT, 3, '0')
     WHERE id = rec.id;
  END LOOP;
END $$;

-- 4. Install the trigger so every future INSERT auto-gets a code
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

-- Verify: show all employee codes
SELECT id, name, employee_code, created_at
  FROM public.users
 ORDER BY employee_code;
