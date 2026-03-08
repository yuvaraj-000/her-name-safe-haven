
-- Allow authority (anon) to SELECT all incidents
CREATE POLICY "Authority can view all incidents"
ON public.incidents FOR SELECT TO anon USING (true);

-- Allow authority (anon) to SELECT all sos_alerts
CREATE POLICY "Authority can view all sos_alerts"
ON public.sos_alerts FOR SELECT TO anon USING (true);

-- Allow authority (anon) to SELECT all evidence
CREATE POLICY "Authority can view all evidence"
ON public.evidence FOR SELECT TO anon USING (true);

-- Allow authority (anon) to SELECT all safety_reports (already has one for authenticated)
CREATE POLICY "Authority can view all safety_reports"
ON public.safety_reports FOR SELECT TO anon USING (true);

-- Enable realtime for sos_alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_alerts;
