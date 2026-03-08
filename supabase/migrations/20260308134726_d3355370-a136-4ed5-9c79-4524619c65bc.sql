
-- Fix: Change authority SELECT policy on evidence to PERMISSIVE so authority can see ALL evidence
DROP POLICY "Authority can view all evidence" ON public.evidence;
CREATE POLICY "Authority can view all evidence"
  ON public.evidence FOR SELECT
  TO authenticated
  USING (true);

-- Enable realtime for evidence table
ALTER PUBLICATION supabase_realtime ADD TABLE public.evidence;
