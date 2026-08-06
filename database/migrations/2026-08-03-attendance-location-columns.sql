ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS location_latitude NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS location_longitude NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS location_accuracy NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS location_verified BOOLEAN,
  ADD COLUMN IF NOT EXISTS location_distance_meters INTEGER;
