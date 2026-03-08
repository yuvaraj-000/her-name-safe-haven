ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS priority_level text DEFAULT 'medium';
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS ai_summary text;