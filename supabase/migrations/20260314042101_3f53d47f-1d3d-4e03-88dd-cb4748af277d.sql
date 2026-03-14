
-- 1. Extend attributions with click_id and event_type
ALTER TABLE public.attributions ADD COLUMN IF NOT EXISTS click_id text;
ALTER TABLE public.attributions ADD COLUMN IF NOT EXISTS event_type text DEFAULT 'purchase';

-- 2. Add cpm to campaign_costs
ALTER TABLE public.campaign_costs ADD COLUMN IF NOT EXISTS cpm numeric DEFAULT 0;

-- 3. Event Queue (server-side retry)
CREATE TABLE public.event_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  retry_count integer NOT NULL DEFAULT 0,
  next_retry_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.event_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon insert event_queue" ON public.event_queue FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select event_queue" ON public.event_queue FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon update event_queue" ON public.event_queue FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 4. Creative Metrics (aggregated)
CREATE TABLE public.creative_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id uuid REFERENCES public.creatives(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  spend numeric DEFAULT 0,
  clicks integer DEFAULT 0,
  conversions integer DEFAULT 0,
  revenue numeric DEFAULT 0,
  roas numeric DEFAULT 0,
  cpa numeric DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.creative_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon select creative_metrics" ON public.creative_metrics FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert creative_metrics" ON public.creative_metrics FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update creative_metrics" ON public.creative_metrics FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 5. Funnel Diagnostics (aggregated)
CREATE TABLE public.funnel_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  visitor_to_click_rate numeric DEFAULT 0,
  click_to_checkout_rate numeric DEFAULT 0,
  checkout_to_payment_rate numeric DEFAULT 0,
  payment_to_purchase_rate numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'healthy',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.funnel_diagnostics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon select funnel_diagnostics" ON public.funnel_diagnostics FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert funnel_diagnostics" ON public.funnel_diagnostics FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update funnel_diagnostics" ON public.funnel_diagnostics FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 6. Session Actions (session replay)
CREATE TABLE public.session_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  event_type text NOT NULL,
  element text,
  scroll_position integer,
  mouse_x integer,
  mouse_y integer,
  page_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.session_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon insert session_actions" ON public.session_actions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select session_actions" ON public.session_actions FOR SELECT TO anon USING (true);
