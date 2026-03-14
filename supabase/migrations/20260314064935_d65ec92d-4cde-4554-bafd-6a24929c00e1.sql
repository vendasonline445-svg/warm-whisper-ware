
-- 1.1 Tabela sites
CREATE TABLE IF NOT EXISTS public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  domain TEXT,
  name TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sites_site_id ON public.sites(site_id);
CREATE INDEX IF NOT EXISTS idx_sites_client_id ON public.sites(client_id);

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin_all_sites" ON public.sites
  FOR ALL TO authenticated
  USING (current_user_role() IN ('superadmin', 'admin'))
  WITH CHECK (current_user_role() IN ('superadmin', 'admin'));

CREATE POLICY "client_own_sites" ON public.sites
  FOR SELECT TO authenticated
  USING (client_id = current_user_client_id());

CREATE POLICY "anon_select_sites" ON public.sites
  FOR SELECT TO anon USING (active = true);

-- 1.2 Tabela payment_gateways
CREATE TABLE IF NOT EXISTS public.payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  api_key TEXT,
  company_id TEXT,
  webhook_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin_all_gateways" ON public.payment_gateways
  FOR ALL TO authenticated
  USING (current_user_role() IN ('superadmin', 'admin'))
  WITH CHECK (current_user_role() IN ('superadmin', 'admin'));

CREATE POLICY "client_own_gateways" ON public.payment_gateways
  FOR SELECT TO authenticated
  USING (client_id = current_user_client_id());

-- 1.3 Índices compostos
CREATE INDEX IF NOT EXISTS idx_events_client_name_date ON public.events(client_id, event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_client_visitor ON public.events(client_id, visitor_id);
CREATE INDEX IF NOT EXISTS idx_events_client_session ON public.events(client_id, session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_client_date ON public.sessions(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkout_leads_client_status ON public.checkout_leads(client_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_client_status ON public.orders(client_id, status, created_at DESC);

-- 1.4 Adicionar site_id nas tabelas de tracking
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS site_id TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS site_id TEXT;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS site_id TEXT;
ALTER TABLE public.checkout_leads ADD COLUMN IF NOT EXISTS site_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS site_id TEXT;

CREATE INDEX IF NOT EXISTS idx_events_site_id ON public.events(site_id);
CREATE INDEX IF NOT EXISTS idx_sessions_site_id ON public.sessions(site_id);
