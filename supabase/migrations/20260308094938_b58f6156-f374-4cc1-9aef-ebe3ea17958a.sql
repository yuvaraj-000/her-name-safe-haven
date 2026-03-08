
-- Add case_id column to incidents for anonymous tracking
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS case_id TEXT UNIQUE;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS identity_revealed BOOLEAN DEFAULT false;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS revealed_at TIMESTAMP WITH TIME ZONE;

-- Create function to auto-generate case IDs
CREATE OR REPLACE FUNCTION public.generate_case_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_case_id TEXT;
BEGIN
  new_case_id := 'HRN-' || LPAD(FLOOR(RANDOM() * 99999 + 10000)::TEXT, 5, '0');
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.incidents WHERE case_id = new_case_id) LOOP
    new_case_id := 'HRN-' || LPAD(FLOOR(RANDOM() * 99999 + 10000)::TEXT, 5, '0');
  END LOOP;
  NEW.case_id := new_case_id;
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate case_id on insert
DROP TRIGGER IF EXISTS trigger_generate_case_id ON public.incidents;
CREATE TRIGGER trigger_generate_case_id
  BEFORE INSERT ON public.incidents
  FOR EACH ROW
  WHEN (NEW.case_id IS NULL)
  EXECUTE FUNCTION public.generate_case_id();

-- Create case_messages table for anonymous chat
CREATE TABLE public.case_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('victim', 'authority', 'system')),
  sender_id UUID,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on case_messages
ALTER TABLE public.case_messages ENABLE ROW LEVEL SECURITY;

-- Victims can view messages for their own cases
CREATE POLICY "Victims can view own case messages"
  ON public.case_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.incidents
      WHERE incidents.id = case_messages.incident_id
      AND incidents.user_id = auth.uid()
    )
  );

-- Victims can send messages to their own cases
CREATE POLICY "Victims can send messages to own cases"
  ON public.case_messages FOR INSERT
  WITH CHECK (
    sender_type = 'victim'
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.incidents
      WHERE incidents.id = case_messages.incident_id
      AND incidents.user_id = auth.uid()
    )
  );

-- Authority can view all case messages
CREATE POLICY "Authority can view all case messages"
  ON public.case_messages FOR SELECT
  USING (true);

-- Authority can send messages (via edge function with service role)
CREATE POLICY "Authority can send messages"
  ON public.case_messages FOR INSERT
  WITH CHECK (sender_type = 'authority');

-- Enable realtime for case_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.case_messages;
