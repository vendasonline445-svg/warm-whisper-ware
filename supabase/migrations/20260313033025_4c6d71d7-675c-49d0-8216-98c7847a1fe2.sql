
DROP POLICY "Allow anonymous select active pixels" ON public.tiktok_pixels;
CREATE POLICY "Allow anonymous select all pixels"
ON public.tiktok_pixels
FOR SELECT
TO anon
USING (true);
