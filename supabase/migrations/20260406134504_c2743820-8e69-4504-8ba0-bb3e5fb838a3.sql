
-- Add expires_at and upvotes columns to safety_reports
ALTER TABLE public.safety_reports
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  ADD COLUMN IF NOT EXISTS upvotes integer NOT NULL DEFAULT 0;

-- Create upvotes tracking table to prevent duplicate upvotes
CREATE TABLE public.safety_report_upvotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.safety_reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(report_id, user_id)
);

ALTER TABLE public.safety_report_upvotes ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view upvotes
CREATE POLICY "Authenticated can view upvotes"
  ON public.safety_report_upvotes FOR SELECT
  TO authenticated USING (true);

-- Users can insert their own upvotes
CREATE POLICY "Users can upvote"
  ON public.safety_report_upvotes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can delete own upvotes
CREATE POLICY "Users can remove upvote"
  ON public.safety_report_upvotes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Allow authenticated users to update safety_reports (for upvote count + expiry reset)
CREATE POLICY "Authenticated can update safety reports"
  ON public.safety_reports FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime for safety_reports
ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_reports;
