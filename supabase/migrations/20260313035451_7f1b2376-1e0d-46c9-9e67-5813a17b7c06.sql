
CREATE TABLE public.tracking_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_url text NOT NULL DEFAULT 'https://tracklybrasil.tech/public/webhook.php?token=wh_73e5eecea7881d9dc7765fbb3d3fffd4593dd823f14b3353a92a87b0b58f49d5&source=vegacheckout',
  webhook_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tracking_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon select settings" ON public.tracking_settings FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon update settings" ON public.tracking_settings FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon insert settings" ON public.tracking_settings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow service role all settings" ON public.tracking_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Insert default row
INSERT INTO public.tracking_settings (webhook_url, webhook_enabled) VALUES (
  'https://tracklybrasil.tech/public/webhook.php?token=wh_73e5eecea7881d9dc7765fbb3d3fffd4593dd823f14b3353a92a87b0b58f49d5&source=vegacheckout',
  true
);

CREATE TABLE public.tracking_webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  webhook_url text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  response text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tracking_webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon select logs" ON public.tracking_webhook_logs FOR SELECT TO anon USING (true);
CREATE POLICY "Allow service role all logs" ON public.tracking_webhook_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
