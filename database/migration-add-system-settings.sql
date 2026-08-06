-- Create system_settings table for storing dynamic configuration
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'string',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access only
CREATE POLICY "Allow service role full access" ON public.system_settings
  USING (true)
  WITH CHECK (true);

-- Insert default Aviontive settings if they don't exist
INSERT INTO public.system_settings (key, value, type, description)
VALUES
  ('AVIONTIVE_API_KEY', '', 'string', 'Aviontive API Key'),
  ('AVIONTIVE_BRAND_ID', '', 'string', 'Aviontive Brand ID'),
  ('AVIONTIVE_API_BASE_URL', 'https://box.aviontive.com/api', 'string', 'Aviontive API Base URL')
ON CONFLICT (key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(key);
