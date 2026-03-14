
DROP POLICY IF EXISTS "anon_update_funnel_state" ON funnel_state;
DROP POLICY IF EXISTS "anon_upsert_funnel_state" ON funnel_state;
DROP POLICY IF EXISTS "anon_insert_funnel_state" ON funnel_state;

CREATE POLICY "anon_insert_funnel_state" ON funnel_state
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update_funnel_state" ON funnel_state
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

ALTER TABLE funnel_state ENABLE ROW LEVEL SECURITY;
