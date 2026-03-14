
-- Campaigns table
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL DEFAULT 'tiktok',
  campaign_name text NOT NULL,
  campaign_external_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select campaigns" ON public.campaigns FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert campaigns" ON public.campaigns FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update campaigns" ON public.campaigns FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete campaigns" ON public.campaigns FOR DELETE TO anon USING (true);

-- Creatives table
CREATE TABLE public.creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  creative_name text NOT NULL,
  creative_external_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select creatives" ON public.creatives FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert creatives" ON public.creatives FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update creatives" ON public.creatives FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete creatives" ON public.creatives FOR DELETE TO anon USING (true);

-- Tracked links table
CREATE TABLE public.tracked_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  creative_id uuid REFERENCES public.creatives(id) ON DELETE SET NULL,
  tracking_id text NOT NULL,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tracked_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select tracked_links" ON public.tracked_links FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert tracked_links" ON public.tracked_links FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update tracked_links" ON public.tracked_links FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete tracked_links" ON public.tracked_links FOR DELETE TO anon USING (true);

-- Clicks table
CREATE TABLE public.clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  tracking_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select clicks" ON public.clicks FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert clicks" ON public.clicks FOR INSERT TO anon WITH CHECK (true);

-- Add campaign_id and creative_id to sessions table
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS creative_id uuid REFERENCES public.creatives(id) ON DELETE SET NULL;
