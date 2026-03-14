
-- 1. Create automation_rules table
CREATE TABLE public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  rule_name text NOT NULL DEFAULT '',
  rule_type text NOT NULL DEFAULT 'cpa_limit',
  metric text NOT NULL DEFAULT 'cpa',
  condition_operator text NOT NULL DEFAULT '>',
  condition_value numeric NOT NULL DEFAULT 0,
  action text NOT NULL DEFAULT 'pause_campaign',
  status text NOT NULL DEFAULT 'active',
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select automation_rules" ON public.automation_rules FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert automation_rules" ON public.automation_rules FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update automation_rules" ON public.automation_rules FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete automation_rules" ON public.automation_rules FOR DELETE TO anon USING (true);

-- 2. Add client_id to attributions
ALTER TABLE public.attributions ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- 3. Add client_id to campaign_costs
ALTER TABLE public.campaign_costs ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
