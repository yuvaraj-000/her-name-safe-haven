
CREATE OR REPLACE FUNCTION public.get_evidence_signed_url(file_path TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  signed_url TEXT;
BEGIN
  SELECT extensions.sign(
    url := format('/storage/v1/object/evidence/%s', file_path),
    secret := current_setting('app.settings.jwt_secret', true),
    exp := extract(epoch from now() + interval '1 hour')::integer
  ) INTO signed_url;
  
  RETURN signed_url;
END;
$$;
