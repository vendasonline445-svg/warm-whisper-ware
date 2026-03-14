
-- Attribution engine table
CREATE TABLE public.attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  session_id text,
  campaign_id uuid REFERENCES public.campaigns(id),
  creative_id uuid REFERENCES public.creatives(id),
  revenue integer DEFAULT 0,
  currency text DEFAULT 'BRL',
  attribution_model text DEFAULT 'last_click',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select attributions" ON public.attributions FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert attributions" ON public.attributions FOR INSERT TO anon WITH CHECK (true);

-- Campaign costs table (TikTok Ads sync)
CREATE TABLE public.campaign_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  date date NOT NULL,
  spend integer DEFAULT 0,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  cpc numeric(10,2) DEFAULT 0,
  ctr numeric(5,4) DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, date)
);

ALTER TABLE public.campaign_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select campaign_costs" ON public.campaign_costs FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert campaign_costs" ON public.campaign_costs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update campaign_costs" ON public.campaign_costs FOR UPDATE TO anon USING (true) WITH CHECK (true);
