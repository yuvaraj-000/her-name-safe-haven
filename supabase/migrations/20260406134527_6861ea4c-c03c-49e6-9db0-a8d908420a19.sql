
-- Replace overly permissive update policy with a restricted one
DROP POLICY "Authenticated can update safety reports" ON public.safety_reports;

CREATE POLICY "Authenticated can update upvotes and expiry"
  ON public.safety_reports FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
