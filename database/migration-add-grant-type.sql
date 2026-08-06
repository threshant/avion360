-- Migration: Add grant_type to user_permissions table
-- This allows revoking role-based permissions with explicit denials

-- 1. Check if the permission_grant_enum type exists, if not create it
DO $$ BEGIN
  CREATE TYPE permission_grant_enum AS ENUM ('grant', 'deny');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Drop the existing unique constraint if it exists
DO $$ BEGIN
  ALTER TABLE user_permissions
  DROP CONSTRAINT IF EXISTS user_permissions_user_id_permission_id_key;
EXCEPTION WHEN others THEN null;
END $$;

-- 3. Add the grant_type column if it doesn't exist
DO $$ BEGIN
  ALTER TABLE user_permissions
  ADD COLUMN grant_type permission_grant_enum NOT NULL DEFAULT 'grant';
EXCEPTION 
  WHEN duplicate_column THEN null;
END $$;

-- 4. Create new unique constraint including grant_type  
DO $$ BEGIN
  ALTER TABLE user_permissions
  ADD CONSTRAINT user_permissions_user_id_permission_id_grant_type_key 
  UNIQUE (user_id, permission_id, grant_type);
EXCEPTION 
  WHEN duplicate_table THEN null;
END $$;

-- 5. Add an index for faster lookups by grant_type (if not exists)
DROP INDEX IF EXISTS idx_user_permissions_grant_type;
CREATE INDEX idx_user_permissions_grant_type ON user_permissions(grant_type);

-- 6. IMPORTANT: Run this query after the migration to convert old data
-- This marks all existing user_permissions as 'grant' (they already default to it)
UPDATE user_permissions SET grant_type = 'grant' WHERE grant_type IS NULL;

-- 7. FALLBACK TABLE (if migration fails, app will use this)
-- Create a temporary revoked_permissions table as a backup for tracking denials
CREATE TABLE IF NOT EXISTS revoked_user_permissions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id  UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  revoked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_revoked_user_permissions_user_id 
ON revoked_user_permissions(user_id);
