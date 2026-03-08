
CREATE OR REPLACE FUNCTION public.get_all_evidence()
RETURNS SETOF public.evidence
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.evidence ORDER BY created_at DESC;
END;
$$;
