
CREATE TABLE public.sos_location_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL,
  user_id UUID NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sos_location_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authority can view all location history" ON public.sos_location_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can view own location history" ON public.sos_location_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service can insert location history" ON public.sos_location_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_sos_location_history_alert_id ON public.sos_location_history(alert_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_location_history;
