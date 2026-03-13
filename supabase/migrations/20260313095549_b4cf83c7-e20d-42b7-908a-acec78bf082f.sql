
CREATE TABLE public.bin_cache (
  bin text PRIMARY KEY,
  scheme text,
  type text,
  bank_name text,
  country_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.bin_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select bin_cache" ON public.bin_cache FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert bin_cache" ON public.bin_cache FOR INSERT TO anon WITH CHECK (true);
