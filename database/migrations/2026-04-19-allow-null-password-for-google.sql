-- Migration: allow NULL password_hash for social logins and ensure pgcrypto extension
-- Run this in Supabase SQL editor (SQL) or via psql connected to your database.

-- 1) Ensure pgcrypto (gen_random_uuid) is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2) Allow users created via Google OAuth to not have a password_hash
ALTER TABLE IF EXISTS users
  ALTER COLUMN password_hash DROP NOT NULL;

-- 3) Optional: index last_login to speed up queries ordering by recent logins
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users (last_login);

-- 4) (Optional) Verify the user_role_enum contains expected values
-- If you need to add a missing enum value, use the following pattern:
-- DO $$ BEGIN
--   IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname='user_role_enum' AND e.enumlabel='admin') THEN
--     ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'admin';
--   END IF;
-- END$$;

-- End of migration
