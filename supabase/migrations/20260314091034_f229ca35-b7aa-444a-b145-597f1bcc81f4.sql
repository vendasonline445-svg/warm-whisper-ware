
-- PROBLEMA 1: anon read tiktok_pixels
DROP POLICY IF EXISTS "anon_read_tiktok_pixels" ON tiktok_pixels;
CREATE POLICY "anon_read_tiktok_pixels" ON tiktok_pixels
  FOR SELECT TO anon
  USING (status = 'active');

-- PROBLEMA 3: event_queue
DROP POLICY IF EXISTS "anon_insert_event_queue" ON event_queue;
CREATE POLICY "anon_insert_event_queue" ON event_queue
  FOR INSERT TO anon WITH CHECK (true);

-- visitors
DROP POLICY IF EXISTS "anon_insert_visitors" ON visitors;
CREATE POLICY "anon_insert_visitors" ON visitors
  FOR INSERT TO anon WITH CHECK (true);

-- sessions
DROP POLICY IF EXISTS "anon_insert_sessions" ON sessions;
CREATE POLICY "anon_insert_sessions" ON sessions
  FOR INSERT TO anon WITH CHECK (true);

-- funnel_state
DROP POLICY IF EXISTS "anon_insert_funnel_state" ON funnel_state;
DROP POLICY IF EXISTS "anon_update_funnel_state" ON funnel_state;
CREATE POLICY "anon_insert_funnel_state" ON funnel_state
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_funnel_state" ON funnel_state
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
