
-- Drop both restrictive SELECT policies and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Authority can view all evidence" ON public.evidence;
DROP POLICY IF EXISTS "Users can view own evidence" ON public.evidence;

-- Recreate as PERMISSIVE (OR logic: either condition grants access)
CREATE POLICY "Users can view own evidence"
ON public.evidence
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authority can view all evidence"
ON public.evidence
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (true);
