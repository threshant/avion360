-- Ensure Supabase RPC lookup can resolve public.record_expense with named args
-- expected by app/api/expenses/route.ts.

CREATE OR REPLACE FUNCTION public.record_expense(
  p_category     TEXT,
  p_party        TEXT,
  p_amount       NUMERIC,
  p_expense_date DATE,
  p_payment_mode TEXT,
  p_reference    TEXT,
  p_description  TEXT,
  p_created_by   TEXT
) RETURNS TABLE (
  id UUID,
  category TEXT,
  party TEXT,
  amount NUMERIC,
  expense_date DATE,
  payment_mode TEXT,
  reference TEXT,
  description TEXT,
  status TEXT,
  transaction_id TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  v_expense RECORD;
  v_txn_id  TEXT;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Expense amount must be greater than zero';
  END IF;
  IF NULLIF(TRIM(p_party), '') IS NULL THEN
    RAISE EXCEPTION 'A party (paid to) must be specified';
  END IF;

  INSERT INTO public.expenses (category, party, amount, expense_date, payment_mode,
                               reference, description, status, created_by)
  VALUES (p_category, TRIM(p_party), p_amount, COALESCE(p_expense_date, CURRENT_DATE),
          p_payment_mode, p_reference, p_description, 'Completed', p_created_by)
  RETURNING * INTO v_expense;

  v_txn_id := 'EXP-' || v_expense.id;
  INSERT INTO public.transactions (id, type, party, amount, date, status, details, is_credit)
  VALUES (v_txn_id, 'Expense', TRIM(p_party), p_amount,
          COALESCE(p_expense_date, CURRENT_DATE), 'Completed',
          COALESCE(NULLIF(TRIM(p_description), ''),
                   p_category || ' expense' || CASE WHEN TRIM(p_party) <> ''
                     THEN ' - ' || TRIM(p_party) ELSE '' END),
          false);

  UPDATE public.expenses
     SET transaction_id = v_txn_id
   WHERE id = v_expense.id;

  v_expense.transaction_id := v_txn_id;
  RETURN QUERY
  SELECT e.id,
         e.category,
         e.party,
         e.amount,
         e.expense_date,
         e.payment_mode,
         e.reference,
         e.description,
         e.status,
         e.transaction_id,
         e.created_by,
         e.created_at,
         e.updated_at
    FROM public.expenses e
   WHERE e.id = v_expense.id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.record_expense(TEXT, TEXT, NUMERIC, DATE, TEXT, TEXT, TEXT, TEXT)
TO anon, authenticated, service_role;

-- Force PostgREST (Supabase API) to refresh schema cache now.
NOTIFY pgrst, 'reload schema';