ALTER TABLE users
  ADD COLUMN IF NOT EXISTS telecmi_user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_users_telecmi_user_id
  ON users (telecmi_user_id)
  WHERE telecmi_user_id IS NOT NULL;