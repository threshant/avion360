-- Allow authenticated users to INSERT manual calls and UPDATE notes
-- Safe to run multiple times (DROP IF EXISTS before recreating policies)

-- INSERT policy: authenticated users can log manual calls
DROP POLICY IF EXISTS "Authenticated users can insert calls" ON calls;
CREATE POLICY "Authenticated users can insert calls"
  ON calls FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE policy: authenticated users can update notes / description on any call
DROP POLICY IF EXISTS "Authenticated users can update call notes" ON calls;
CREATE POLICY "Authenticated users can update call notes"
  ON calls FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant permissions to authenticated role
GRANT INSERT ON calls TO authenticated;
GRANT UPDATE (notes, caller_name, phone, call_type, status, updated_at) ON calls TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE calls_id_seq TO authenticated;
