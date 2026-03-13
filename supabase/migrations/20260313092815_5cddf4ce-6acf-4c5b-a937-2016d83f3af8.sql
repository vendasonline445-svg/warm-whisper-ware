
CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  page text NOT NULL DEFAULT '/'
);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous insert page_views" ON public.page_views FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous select page_views" ON public.page_views FOR SELECT TO anon USING (true);
