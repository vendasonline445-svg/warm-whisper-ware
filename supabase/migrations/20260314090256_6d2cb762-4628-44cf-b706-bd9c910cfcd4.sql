
CREATE TABLE IF NOT EXISTS public.tiktok_event_dedup (
  event_id TEXT NOT NULL,
  pixel_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (event_id, pixel_id)
);

ALTER TABLE public.tiktok_event_dedup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.tiktok_event_dedup FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon_insert_dedup" ON public.tiktok_event_dedup FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_dedup" ON public.tiktok_event_dedup FOR SELECT TO anon USING (true);
