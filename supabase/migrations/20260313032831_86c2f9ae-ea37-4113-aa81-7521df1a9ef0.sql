
CREATE TABLE public.tiktok_pixels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  pixel_id text NOT NULL,
  api_token text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tiktok_pixels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous select active pixels"
ON public.tiktok_pixels
FOR SELECT
TO anon
USING (status = 'active');

CREATE POLICY "Allow anonymous insert pixels"
ON public.tiktok_pixels
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anonymous update pixels"
ON public.tiktok_pixels
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anonymous delete pixels"
ON public.tiktok_pixels
FOR DELETE
TO anon
USING (true);
