-- Align memberships.user_id with the app users table used by custom auth.
-- This fixes signup/login flows that create rows in public.users instead of auth.users.
ALTER TABLE memberships
  DROP CONSTRAINT IF EXISTS memberships_user_id_fkey;

ALTER TABLE memberships
  ADD CONSTRAINT memberships_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;
