
-- Tabela de configuração de tracking por site
CREATE TABLE IF NOT EXISTS site_tracking_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL,

  selector_buy_button    TEXT,
  selector_checkout_form TEXT,
  selector_price         TEXT,
  selector_pix_qrcode    TEXT,

  url_checkout   TEXT,
  url_thankyou   TEXT,
  url_upsell     TEXT,

  value_selector TEXT,
  value_static   NUMERIC,
  value_attribute TEXT,

  checkout_type  TEXT DEFAULT 'api',
  spa_mode       BOOLEAN DEFAULT true,
  debug_mode     BOOLEAN DEFAULT false,

  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_site_tracking_config_site_id
  ON site_tracking_config(site_id);

ALTER TABLE site_tracking_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_tracking_config" ON site_tracking_config
  FOR SELECT TO anon USING (true);

CREATE POLICY "auth_manage_tracking_config" ON site_tracking_config
  FOR ALL TO authenticated
  USING (current_user_role() IN ('superadmin', 'admin'))
  WITH CHECK (current_user_role() IN ('superadmin', 'admin'));

-- Tabela de log de eventos do tracker
CREATE TABLE IF NOT EXISTS tracker_event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  source TEXT NOT NULL,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracker_event_log_site_id
  ON tracker_event_log(site_id, created_at DESC);

ALTER TABLE tracker_event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_tracker_log" ON tracker_event_log
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "auth_read_tracker_log" ON tracker_event_log
  FOR SELECT TO authenticated
  USING (current_user_role() IN ('superadmin', 'admin'));

CREATE POLICY "service_insert_tracker_log" ON tracker_event_log
  FOR INSERT TO authenticated WITH CHECK (true);
