
-- Drop the restrictive authority SELECT policy and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Authority can view all evidence" ON public.evidence;

CREATE POLICY "Authority can view all evidence"
ON public.evidence
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (true);
