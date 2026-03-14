
-- ============================================================
-- DROP ALL EXISTING PERMISSIVE ANON POLICIES
-- ============================================================

-- visitors
DROP POLICY IF EXISTS "Allow anon insert visitors" ON visitors;
DROP POLICY IF EXISTS "Allow anon select visitors" ON visitors;
DROP POLICY IF EXISTS "Allow anon update visitors" ON visitors;

-- sessions
DROP POLICY IF EXISTS "Allow anon insert sessions" ON sessions;
DROP POLICY IF EXISTS "Allow anon select sessions" ON sessions;

-- events
DROP POLICY IF EXISTS "Allow anon insert events" ON events;
DROP POLICY IF EXISTS "Allow anon select events" ON events;

-- funnel_state
DROP POLICY IF EXISTS "Allow anon insert funnel_state" ON funnel_state;
DROP POLICY IF EXISTS "Allow anon select funnel_state" ON funnel_state;
DROP POLICY IF EXISTS "Allow anon update funnel_state" ON funnel_state;

-- clicks
DROP POLICY IF EXISTS "Allow anon insert clicks" ON clicks;
DROP POLICY IF EXISTS "Allow anon select clicks" ON clicks;

-- checkout_leads
DROP POLICY IF EXISTS "Allow anonymous insert" ON checkout_leads;
DROP POLICY IF EXISTS "Allow anonymous select" ON checkout_leads;
DROP POLICY IF EXISTS "Allow service role update" ON checkout_leads;

-- orders
DROP POLICY IF EXISTS "Allow anon insert orders" ON orders;
DROP POLICY IF EXISTS "Allow anon select orders" ON orders;
DROP POLICY IF EXISTS "Allow anon update orders" ON orders;
DROP POLICY IF EXISTS "Allow service role all orders" ON orders;

-- order_tracking
DROP POLICY IF EXISTS "Allow anon select" ON order_tracking;
DROP POLICY IF EXISTS "Allow service role all" ON order_tracking;

-- tracked_links
DROP POLICY IF EXISTS "Allow anon insert tracked_links" ON tracked_links;
DROP POLICY IF EXISTS "Allow anon select tracked_links" ON tracked_links;
DROP POLICY IF EXISTS "Allow anon update tracked_links" ON tracked_links;
DROP POLICY IF EXISTS "Allow anon delete tracked_links" ON tracked_links;

-- campaigns
DROP POLICY IF EXISTS "Allow anon insert campaigns" ON campaigns;
DROP POLICY IF EXISTS "Allow anon select campaigns" ON campaigns;
DROP POLICY IF EXISTS "Allow anon update campaigns" ON campaigns;
DROP POLICY IF EXISTS "Allow anon delete campaigns" ON campaigns;

-- creatives
DROP POLICY IF EXISTS "Allow anon insert creatives" ON creatives;
DROP POLICY IF EXISTS "Allow anon select creatives" ON creatives;
DROP POLICY IF EXISTS "Allow anon update creatives" ON creatives;
DROP POLICY IF EXISTS "Allow anon delete creatives" ON creatives;

-- campaign_costs
DROP POLICY IF EXISTS "Allow anon insert campaign_costs" ON campaign_costs;
DROP POLICY IF EXISTS "Allow anon select campaign_costs" ON campaign_costs;
DROP POLICY IF EXISTS "Allow anon update campaign_costs" ON campaign_costs;

-- creative_metrics
DROP POLICY IF EXISTS "Allow anon insert creative_metrics" ON creative_metrics;
DROP POLICY IF EXISTS "Allow anon select creative_metrics" ON creative_metrics;
DROP POLICY IF EXISTS "Allow anon update creative_metrics" ON creative_metrics;

-- attributions
DROP POLICY IF EXISTS "Allow anon insert attributions" ON attributions;
DROP POLICY IF EXISTS "Allow anon select attributions" ON attributions;

-- clients
DROP POLICY IF EXISTS "Allow anon insert clients" ON clients;
DROP POLICY IF EXISTS "Allow anon select clients" ON clients;
DROP POLICY IF EXISTS "Allow anon update clients" ON clients;
DROP POLICY IF EXISTS "Allow anon delete clients" ON clients;

-- tiktok_pixels
DROP POLICY IF EXISTS "Allow anonymous insert pixels" ON tiktok_pixels;
DROP POLICY IF EXISTS "Allow anonymous select all pixels" ON tiktok_pixels;
DROP POLICY IF EXISTS "Allow anonymous update pixels" ON tiktok_pixels;
DROP POLICY IF EXISTS "Allow anonymous delete pixels" ON tiktok_pixels;

-- integration_settings
DROP POLICY IF EXISTS "Allow anon insert integration_settings" ON integration_settings;
DROP POLICY IF EXISTS "Allow anon select integration_settings" ON integration_settings;
DROP POLICY IF EXISTS "Allow anon update integration_settings" ON integration_settings;
DROP POLICY IF EXISTS "Allow anon delete integration_settings" ON integration_settings;

-- tracking_settings
DROP POLICY IF EXISTS "Allow anon insert settings" ON tracking_settings;
DROP POLICY IF EXISTS "Allow anon select settings" ON tracking_settings;
DROP POLICY IF EXISTS "Allow anon update settings" ON tracking_settings;
DROP POLICY IF EXISTS "Allow service role all settings" ON tracking_settings;

-- api_logs
DROP POLICY IF EXISTS "Allow anon insert api_logs" ON api_logs;
DROP POLICY IF EXISTS "Allow anon select api_logs" ON api_logs;

-- automation_rules
DROP POLICY IF EXISTS "Allow anon insert automation_rules" ON automation_rules;
DROP POLICY IF EXISTS "Allow anon select automation_rules" ON automation_rules;
DROP POLICY IF EXISTS "Allow anon update automation_rules" ON automation_rules;
DROP POLICY IF EXISTS "Allow anon delete automation_rules" ON automation_rules;

-- business_centers
DROP POLICY IF EXISTS "Allow anon insert business_centers" ON business_centers;
DROP POLICY IF EXISTS "Allow anon select business_centers" ON business_centers;
DROP POLICY IF EXISTS "Allow anon update business_centers" ON business_centers;
DROP POLICY IF EXISTS "Allow anon delete business_centers" ON business_centers;

-- event_queue
DROP POLICY IF EXISTS "Allow anon insert event_queue" ON event_queue;
DROP POLICY IF EXISTS "Allow anon select event_queue" ON event_queue;
DROP POLICY IF EXISTS "Allow anon update event_queue" ON event_queue;

-- funnel_diagnostics
DROP POLICY IF EXISTS "Allow anon insert funnel_diagnostics" ON funnel_diagnostics;
DROP POLICY IF EXISTS "Allow anon select funnel_diagnostics" ON funnel_diagnostics;
DROP POLICY IF EXISTS "Allow anon update funnel_diagnostics" ON funnel_diagnostics;

-- user_events
DROP POLICY IF EXISTS "Allow anonymous insert user_events" ON user_events;
DROP POLICY IF EXISTS "Allow anonymous select user_events" ON user_events;

-- page_views
DROP POLICY IF EXISTS "Allow anonymous insert page_views" ON page_views;
DROP POLICY IF EXISTS "Allow anonymous select page_views" ON page_views;

-- session_actions
DROP POLICY IF EXISTS "Allow anon insert session_actions" ON session_actions;
DROP POLICY IF EXISTS "Allow anon select session_actions" ON session_actions;

-- tracking_webhook_logs
DROP POLICY IF EXISTS "Allow anon select logs" ON tracking_webhook_logs;
DROP POLICY IF EXISTS "Allow service role all logs" ON tracking_webhook_logs;

-- ============================================================
-- NEW POLICIES: Tracking tables (anon can INSERT, only auth can read)
-- ============================================================

-- visitors
CREATE POLICY "anon_insert_visitors" ON visitors FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_visitors" ON visitors FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_visitors" ON visitors FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- sessions
CREATE POLICY "anon_insert_sessions" ON sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "auth_all_sessions" ON sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- events
CREATE POLICY "anon_insert_events" ON events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "auth_all_events" ON events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- funnel_state
CREATE POLICY "anon_upsert_funnel_state" ON funnel_state FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_funnel_state" ON funnel_state FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_funnel_state" ON funnel_state FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- clicks
CREATE POLICY "anon_insert_clicks" ON clicks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "auth_all_clicks" ON clicks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- CHECKOUT (anon can insert + update for webhooks, auth can read all)
-- ============================================================

CREATE POLICY "anon_insert_checkout_leads" ON checkout_leads FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_checkout_leads" ON checkout_leads FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_checkout_leads" ON checkout_leads FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_insert_orders" ON orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_orders" ON orders FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_orders" ON orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_insert_order_tracking" ON order_tracking FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "auth_all_order_tracking" ON order_tracking FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- tracked_links: anon needs SELECT for /r/:trackingId redirect
CREATE POLICY "anon_select_tracked_links" ON tracked_links FOR SELECT TO anon USING (true);
CREATE POLICY "auth_all_tracked_links" ON tracked_links FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- ADMIN-ONLY tables (only authenticated users)
-- ============================================================

CREATE POLICY "auth_all_campaigns" ON campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_creatives" ON creatives FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_campaign_costs" ON campaign_costs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_creative_metrics" ON creative_metrics FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_attributions" ON attributions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_clients" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_tiktok_pixels" ON tiktok_pixels FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_integration_settings" ON integration_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_tracking_settings" ON tracking_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_api_logs" ON api_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_automation_rules" ON automation_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_business_centers" ON business_centers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_funnel_diagnostics" ON funnel_diagnostics FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_event_queue" ON event_queue FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_tracking_webhook_logs" ON tracking_webhook_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- user_events & page_views (legacy — anon can still insert, auth can read)
CREATE POLICY "anon_insert_user_events" ON user_events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "auth_all_user_events" ON user_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_insert_page_views" ON page_views FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "auth_all_page_views" ON page_views FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- session_actions (anon can insert for session replay, auth can read)
CREATE POLICY "anon_insert_session_actions" ON session_actions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "auth_all_session_actions" ON session_actions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- bin_cache (anon needs insert + select for BIN lookup)
CREATE POLICY "anon_insert_bin_cache" ON bin_cache FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_bin_cache" ON bin_cache FOR SELECT TO anon USING (true);
CREATE POLICY "auth_all_bin_cache" ON bin_cache FOR ALL TO authenticated USING (true) WITH CHECK (true);
