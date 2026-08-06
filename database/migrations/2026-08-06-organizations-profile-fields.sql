-- Add company profile metadata captured during signup onboarding
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS team_size INTEGER,
  ADD COLUMN IF NOT EXISTS company_website TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organizations_team_size_check'
  ) THEN
    ALTER TABLE organizations
      ADD CONSTRAINT organizations_team_size_check
      CHECK (team_size IS NULL OR team_size > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_organizations_industry
  ON organizations(industry);
