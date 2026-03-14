
-- ============================================================
-- MIGRATION: Performance Indexes — FunnelIQ
-- ============================================================

-- events (most queried table)
CREATE INDEX IF NOT EXISTS idx_events_visitor_id ON events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_event_name ON events(event_name);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_client_id ON events(client_id);
CREATE INDEX IF NOT EXISTS idx_events_campaign ON events(campaign);

-- sessions
CREATE INDEX IF NOT EXISTS idx_sessions_visitor_id ON sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_client_id ON sessions(client_id);

-- checkout_leads
CREATE INDEX IF NOT EXISTS idx_checkout_leads_status ON checkout_leads(status);
CREATE INDEX IF NOT EXISTS idx_checkout_leads_created_at ON checkout_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkout_leads_client_id ON checkout_leads(client_id);

-- orders
CREATE INDEX IF NOT EXISTS idx_orders_visitor_id ON orders(visitor_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);

-- attributions
CREATE INDEX IF NOT EXISTS idx_attributions_campaign_id ON attributions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_attributions_session_id ON attributions(session_id);
CREATE INDEX IF NOT EXISTS idx_attributions_created_at ON attributions(created_at DESC);

-- funnel_state
CREATE INDEX IF NOT EXISTS idx_funnel_state_stage ON funnel_state(stage);

-- campaign_costs
CREATE INDEX IF NOT EXISTS idx_campaign_costs_campaign_id ON campaign_costs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_costs_date ON campaign_costs(date DESC);

-- clicks
CREATE INDEX IF NOT EXISTS idx_clicks_session_id ON clicks(session_id);
CREATE INDEX IF NOT EXISTS idx_clicks_tracking_id ON clicks(tracking_id);
