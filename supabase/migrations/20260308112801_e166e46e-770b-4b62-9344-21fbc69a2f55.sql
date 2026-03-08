
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS incident_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS incident_time text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS suspect_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS suspect_phone text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS suspect_relationship text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS safety_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS contact_preference text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS contact_phone text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS contact_email text DEFAULT NULL;
