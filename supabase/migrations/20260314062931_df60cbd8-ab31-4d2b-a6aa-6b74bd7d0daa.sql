
-- ============================================================
-- 1. Tabela de perfis vinculada ao Supabase Auth
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'client',
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Helper functions (SECURITY DEFINER to avoid recursion)
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.current_user_client_id()
RETURNS UUID AS $$
  SELECT client_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 3. Trigger: auto-create profile on auth user creation
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'client')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 4. RLS policies on profiles (using security definer to avoid recursion)
-- ============================================================
CREATE POLICY "superadmin_all_profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('superadmin', 'admin'))
  WITH CHECK (public.current_user_role() IN ('superadmin', 'admin'));

CREATE POLICY "own_profile_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- ============================================================
-- 5. Drop ALL old RLS policies on data tables
-- ============================================================
DROP POLICY IF EXISTS "auth_all_events" ON events;
DROP POLICY IF EXISTS "anon_insert_events" ON events;
DROP POLICY IF EXISTS "auth_all_sessions" ON sessions;
DROP POLICY IF EXISTS "anon_insert_sessions" ON sessions;
DROP POLICY IF EXISTS "auth_all_visitors" ON visitors;
DROP POLICY IF EXISTS "anon_insert_visitors" ON visitors;
DROP POLICY IF EXISTS "anon_update_visitors" ON visitors;
DROP POLICY IF EXISTS "auth_all_funnel_state" ON funnel_state;
DROP POLICY IF EXISTS "anon_upsert_funnel_state" ON funnel_state;
DROP POLICY IF EXISTS "anon_update_funnel_state" ON funnel_state;
DROP POLICY IF EXISTS "auth_all_clicks" ON clicks;
DROP POLICY IF EXISTS "anon_insert_clicks" ON clicks;
DROP POLICY IF EXISTS "auth_all_tracked_links" ON tracked_links;
DROP POLICY IF EXISTS "anon_select_tracked_links" ON tracked_links;
DROP POLICY IF EXISTS "auth_all_checkout_leads" ON checkout_leads;
DROP POLICY IF EXISTS "anon_insert_checkout_leads" ON checkout_leads;
DROP POLICY IF EXISTS "anon_update_checkout_leads" ON checkout_leads;
DROP POLICY IF EXISTS "auth_all_orders" ON orders;
DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
DROP POLICY IF EXISTS "anon_update_orders" ON orders;
DROP POLICY IF EXISTS "auth_all_campaigns" ON campaigns;
DROP POLICY IF EXISTS "auth_all_creatives" ON creatives;
DROP POLICY IF EXISTS "auth_all_campaign_costs" ON campaign_costs;
DROP POLICY IF EXISTS "auth_all_creative_metrics" ON creative_metrics;
DROP POLICY IF EXISTS "auth_all_attributions" ON attributions;
DROP POLICY IF EXISTS "auth_all_clients" ON clients;
DROP POLICY IF EXISTS "auth_all_tiktok_pixels" ON tiktok_pixels;
DROP POLICY IF EXISTS "auth_all_integration_settings" ON integration_settings;
DROP POLICY IF EXISTS "auth_all_tracking_settings" ON tracking_settings;
DROP POLICY IF EXISTS "auth_all_api_logs" ON api_logs;
DROP POLICY IF EXISTS "auth_all_automation_rules" ON automation_rules;
DROP POLICY IF EXISTS "auth_all_business_centers" ON business_centers;
DROP POLICY IF EXISTS "auth_all_funnel_diagnostics" ON funnel_diagnostics;
DROP POLICY IF EXISTS "auth_all_order_tracking" ON order_tracking;
DROP POLICY IF EXISTS "anon_insert_order_tracking" ON order_tracking;
DROP POLICY IF EXISTS "auth_all_event_queue" ON event_queue;
DROP POLICY IF EXISTS "auth_all_session_actions" ON session_actions;
DROP POLICY IF EXISTS "anon_insert_session_actions" ON session_actions;
DROP POLICY IF EXISTS "auth_all_tracking_webhook_logs" ON tracking_webhook_logs;
DROP POLICY IF EXISTS "auth_all_bin_cache" ON bin_cache;
DROP POLICY IF EXISTS "anon_insert_bin_cache" ON bin_cache;
DROP POLICY IF EXISTS "anon_select_bin_cache" ON bin_cache;
DROP POLICY IF EXISTS "Allow anon insert bin_cache" ON bin_cache;
DROP POLICY IF EXISTS "Allow anon select bin_cache" ON bin_cache;
DROP POLICY IF EXISTS "auth_all_page_views" ON page_views;
DROP POLICY IF EXISTS "anon_insert_page_views" ON page_views;
DROP POLICY IF EXISTS "auth_all_user_events" ON user_events;
DROP POLICY IF EXISTS "anon_insert_user_events" ON user_events;

-- ============================================================
-- 6. New role-based RLS policies
-- ============================================================

-- events
CREATE POLICY "events_select_auth" ON events FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('superadmin','admin') OR client_id = public.current_user_client_id());
CREATE POLICY "events_insert_anon" ON events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "events_insert_auth" ON events FOR INSERT TO authenticated WITH CHECK (true);

-- sessions
CREATE POLICY "sessions_select_auth" ON sessions FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('superadmin','admin') OR client_id = public.current_user_client_id());
CREATE POLICY "sessions_insert_anon" ON sessions FOR INSERT TO anon WITH CHECK (true);

-- visitors
CREATE POLICY "visitors_select_auth" ON visitors FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('superadmin','admin'));
CREATE POLICY "visitors_insert_anon" ON visitors FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "visitors_update_anon" ON visitors FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- funnel_state
CREATE POLICY "funnel_state_select_auth" ON funnel_state FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('superadmin','admin'));
CREATE POLICY "funnel_state_insert_anon" ON funnel_state FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "funnel_state_update_anon" ON funnel_state FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- clicks
CREATE POLICY "clicks_select_auth" ON clicks FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('superadmin','admin'));
CREATE POLICY "clicks_insert_anon" ON clicks FOR INSERT TO anon WITH CHECK (true);

-- tracked_links
CREATE POLICY "tracked_links_select_anon" ON tracked_links FOR SELECT TO anon USING (true);
CREATE POLICY "tracked_links_all_auth" ON tracked_links FOR ALL TO authenticated
  USING (public.current_user_role() IN ('superadmin','admin'))
  WITH CHECK (public.current_user_role() IN ('superadmin','admin'));

-- checkout_leads
CREATE POLICY "checkout_leads_insert_anon" ON checkout_leads FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "checkout_leads_update_anon" ON checkout_leads FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "checkout_leads_select_auth" ON checkout_leads FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('superadmin','admin') OR client_id = public.current_user_client_id());
CREATE POLICY "checkout_leads_manage_auth" ON checkout_leads FOR UPDATE TO authenticated
  USING (public.current_user_role() IN ('superadmin','admin'))
  WITH CHECK (public.current_user_role() IN ('superadmin','admin'));

-- orders
CREATE POLICY "orders_insert_anon" ON orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "orders_update_anon" ON orders FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "orders_select_auth" ON orders FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('superadmin','admin') OR client_id = public.current_user_client_id());

-- campaigns / creatives / campaign_costs / creative_metrics / attributions
CREATE POLICY "campaigns_all_auth" ON campaigns FOR ALL TO authenticated
  USING (public.current_user_role() IN ('superadmin','admin'))
  WITH CHECK (public.current_user_role() IN ('superadmin','admin'));
CREATE POLICY "creatives_all_auth" ON creatives FOR ALL TO authenticated
  USING (public.current_user_role() IN ('superadmin','admin'))
  WITH CHECK (public.current_user_role() IN ('superadmin','admin'));
CREATE POLICY "campaign_costs_all_auth" ON campaign_costs FOR ALL TO authenticated
  USING (public.current_user_role() IN ('superadmin','admin'))
  WITH CHECK (public.current_user_role() IN ('superadmin','admin'));
CREATE POLICY "creative_metrics_all_auth" ON creative_metrics FOR ALL TO authenticated
  USING (public.current_user_role() IN ('superadmin','admin'))
  WITH CHECK (public.current_user_role() IN ('superadmin','admin'));
CREATE POLICY "attributions_all_auth" ON attributions FOR ALL TO authenticated
  USING (public.current_user_role() IN ('superadmin','admin'))
  WITH CHECK (public.current_user_role() IN ('superadmin','admin'));

-- admin-only tables
CREATE POLICY "clients_all_auth" ON clients FOR ALL TO authenticated
  USING (public.current_user_role() IN ('superadmin','admin'))
  WITH CHECK (public.current_user_role() IN ('superadmin','admin'));
CREATE POLICY "tiktok_pixels_all_auth" ON tiktok_pixels FOR ALL TO authenticated
  USING (public.current_user_role() IN ('superadmin','admin'))
  WITH CHECK (public.current_user_role() IN ('superadmin','admin'));
CREATE POLICY "integration_settings_all_auth" ON integration_settings FOR ALL TO authenticated
  USING (public.current_user_role() IN ('superadmin','admin'))
  WITH CHECK (public.current_user_role() IN ('superadmin','admin'));
CREATE POLICY "tracking_settings_all_auth" ON tracking_settings FOR ALL TO authenticated
  USING (public.current_user_role() IN ('superadmin','admin'))
  WITH CHECK (public.current_user_role() IN ('superadmin','admin'));
CREATE POLICY "api_logs_all_auth" ON api_logs FOR ALL TO authenticated
  USING (public.current_user_role() IN ('superadmin','admin'))
  WITH CHECK (public.current_user_role() IN ('superadmin','admin'));
CREATE POLICY "automation_rules_all_auth" ON automation_rules FOR ALL TO authenticated
  USING (public.current_user_role() IN ('superadmin','admin'))
  WITH CHECK (public.current_user_role() IN ('superadmin','admin'));
CREATE POLICY "business_centers_all_auth" ON business_centers FOR ALL TO authenticated
  USING (public.current_user_role() IN ('superadmin','admin'))
  WITH CHECK (public.current_user_role() IN ('superadmin','admin'));
CREATE POLICY "funnel_diagnostics_all_auth" ON funnel_diagnostics FOR ALL TO authenticated
  USING (public.current_user_role() IN ('superadmin','admin'))
  WITH CHECK (public.current_user_role() IN ('superadmin','admin'));
CREATE POLICY "order_tracking_all_auth" ON order_tracking FOR ALL TO authenticated
  USING (public.current_user_role() IN ('superadmin','admin'))
  WITH CHECK (public.current_user_role() IN ('superadmin','admin'));
CREATE POLICY "order_tracking_insert_anon" ON order_tracking FOR INSERT TO anon WITH CHECK (true);

-- event_queue
CREATE POLICY "event_queue_all_auth" ON event_queue FOR ALL TO authenticated
  USING (public.current_user_role() IN ('superadmin','admin'))
  WITH CHECK (public.current_user_role() IN ('superadmin','admin'));

-- session_actions
CREATE POLICY "session_actions_all_auth" ON session_actions FOR ALL TO authenticated
  USING (public.current_user_role() IN ('superadmin','admin'))
  WITH CHECK (public.current_user_role() IN ('superadmin','admin'));
CREATE POLICY "session_actions_insert_anon" ON session_actions FOR INSERT TO anon WITH CHECK (true);

-- tracking_webhook_logs
CREATE POLICY "tracking_webhook_logs_all_auth" ON tracking_webhook_logs FOR ALL TO authenticated
  USING (public.current_user_role() IN ('superadmin','admin'))
  WITH CHECK (public.current_user_role() IN ('superadmin','admin'));

-- bin_cache
CREATE POLICY "bin_cache_all_auth" ON bin_cache FOR ALL TO authenticated
  USING (public.current_user_role() IN ('superadmin','admin'))
  WITH CHECK (public.current_user_role() IN ('superadmin','admin'));
CREATE POLICY "bin_cache_insert_anon" ON bin_cache FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "bin_cache_select_anon" ON bin_cache FOR SELECT TO anon USING (true);

-- page_views (legacy)
CREATE POLICY "page_views_all_auth" ON page_views FOR ALL TO authenticated
  USING (public.current_user_role() IN ('superadmin','admin'))
  WITH CHECK (public.current_user_role() IN ('superadmin','admin'));
CREATE POLICY "page_views_insert_anon" ON page_views FOR INSERT TO anon WITH CHECK (true);

-- user_events (legacy)
CREATE POLICY "user_events_all_auth" ON user_events FOR ALL TO authenticated
  USING (public.current_user_role() IN ('superadmin','admin'))
  WITH CHECK (public.current_user_role() IN ('superadmin','admin'));
CREATE POLICY "user_events_insert_anon" ON user_events FOR INSERT TO anon WITH CHECK (true);

-- ============================================================
-- 7. Performance indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_events_visitor_id ON events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_event_name ON events(event_name);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_client_id ON events(client_id);
CREATE INDEX IF NOT EXISTS idx_sessions_visitor_id ON sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_client_id ON sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_checkout_leads_status ON checkout_leads(status);
CREATE INDEX IF NOT EXISTS idx_checkout_leads_client_id ON checkout_leads(client_id);
CREATE INDEX IF NOT EXISTS idx_attributions_campaign_id ON attributions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_client_id ON profiles(client_id);
