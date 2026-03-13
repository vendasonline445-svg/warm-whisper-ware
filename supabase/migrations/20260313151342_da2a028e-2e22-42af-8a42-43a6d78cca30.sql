
-- Migrate visitors from user_events (extract unique visitor_ids)
INSERT INTO public.visitors (visitor_id, first_seen, device, created_at)
SELECT DISTINCT ON (vid)
  vid,
  MIN(ue.created_at) OVER (PARTITION BY vid),
  COALESCE(ue.event_data->>'device_type', ue.event_data->>'device', 'unknown'),
  MIN(ue.created_at) OVER (PARTITION BY vid)
FROM public.user_events ue,
LATERAL (SELECT COALESCE(NULLIF(ue.event_data->>'visitor_id', ''), ue.id::text) AS vid) sub
WHERE ue.event_data->>'visitor_id' IS NOT NULL
  AND ue.event_data->>'visitor_id' != ''
ON CONFLICT (visitor_id) DO NOTHING;

-- Migrate sessions from user_events
INSERT INTO public.sessions (session_id, visitor_id, device, utm_source, utm_campaign, utm_medium, utm_content, utm_term, ttclid, referrer, created_at)
SELECT DISTINCT ON (sid)
  sid,
  COALESCE(NULLIF(ue.event_data->>'visitor_id', ''), 'unknown'),
  COALESCE(ue.event_data->>'device_type', ue.event_data->>'device', 'unknown'),
  ue.event_data->>'utm_source',
  ue.event_data->>'utm_campaign',
  ue.event_data->>'utm_medium',
  ue.event_data->>'utm_content',
  ue.event_data->>'utm_term',
  ue.event_data->>'ttclid',
  ue.event_data->>'referrer',
  MIN(ue.created_at) OVER (PARTITION BY sid)
FROM public.user_events ue,
LATERAL (SELECT COALESCE(NULLIF(ue.event_data->>'session_id', ''), ue.id::text) AS sid) sub
WHERE ue.event_data->>'session_id' IS NOT NULL
  AND ue.event_data->>'session_id' != ''
  AND COALESCE(NULLIF(ue.event_data->>'visitor_id', ''), 'unknown') IN (SELECT visitor_id FROM public.visitors)
ON CONFLICT (session_id) DO NOTHING;

-- Migrate events from user_events
INSERT INTO public.events (visitor_id, session_id, event_name, value, source, campaign, event_data, created_at)
SELECT
  COALESCE(NULLIF(ue.event_data->>'visitor_id', ''), 'unknown'),
  ue.event_data->>'session_id',
  ue.event_type,
  0,
  ue.event_data->>'utm_source',
  ue.event_data->>'utm_campaign',
  ue.event_data,
  ue.created_at
FROM public.user_events ue;

-- Migrate orders from checkout_leads
INSERT INTO public.orders (visitor_id, lead_id, payment_method, status, value, transaction_id, created_at)
SELECT
  COALESCE(NULLIF(cl.metadata->>'visitor_id', ''), cl.id::text),
  cl.id,
  cl.payment_method,
  CASE
    WHEN cl.status = 'paid' OR cl.status = 'approved' THEN 'paid'::order_status
    WHEN cl.payment_method = 'pix' AND cl.transaction_id IS NOT NULL THEN 'pix_generated'::order_status
    WHEN cl.status = 'pending' THEN 'pending'::order_status
    ELSE 'checkout_started'::order_status
  END,
  COALESCE(cl.total_amount, 0),
  cl.transaction_id,
  cl.created_at
FROM public.checkout_leads cl;
