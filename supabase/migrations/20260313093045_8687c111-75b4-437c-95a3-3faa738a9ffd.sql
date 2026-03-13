
CREATE TABLE public.user_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous insert user_events" ON public.user_events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous select user_events" ON public.user_events FOR SELECT TO anon USING (true);
