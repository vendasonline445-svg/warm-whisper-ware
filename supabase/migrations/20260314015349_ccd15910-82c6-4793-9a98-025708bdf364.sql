CREATE TABLE public.integration_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_key text NOT NULL UNIQUE,
  name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select integration_settings" ON public.integration_settings FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert integration_settings" ON public.integration_settings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update integration_settings" ON public.integration_settings FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete integration_settings" ON public.integration_settings FOR DELETE TO anon USING (true);

-- Seed default integrations
INSERT INTO public.integration_settings (integration_key, name, enabled, config) VALUES
  ('clarity', 'Microsoft Clarity', true, '{"project_id": "vsbxker0lm"}'::jsonb),
  ('xtracky', 'xTracky', true, '{"token": "45fe2123-fa22-4c43-9a3b-1b0629b5f2a7"}'::jsonb),
  ('utmify', 'UTMify', true, '{"api_token": "", "events": ["waiting_payment", "paid"]}'::jsonb),
  ('meta', 'Meta Pixel', false, '{"pixel_id": ""}'::jsonb),
  ('gtag', 'Google Analytics', false, '{"measurement_id": ""}'::jsonb),
  ('gtm', 'Google Tag Manager', false, '{"container_id": ""}'::jsonb)
ON CONFLICT (integration_key) DO NOTHING;