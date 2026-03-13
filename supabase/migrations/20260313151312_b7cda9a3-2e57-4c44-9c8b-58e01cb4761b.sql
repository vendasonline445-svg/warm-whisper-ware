
-- Enum for funnel stages
CREATE TYPE public.funnel_stage AS ENUM (
  'visit', 'view_content', 'add_to_cart', 'checkout', 'pix_generated', 'card_submitted', 'purchase'
);

-- Enum for order status
CREATE TYPE public.order_status AS ENUM (
  'checkout_started', 'pix_generated', 'pending', 'paid', 'failed'
);

-- 1. Visitors table
CREATE TABLE public.visitors (
  visitor_id text PRIMARY KEY,
  first_seen timestamp with time zone NOT NULL DEFAULT now(),
  device text,
  country text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon insert visitors" ON public.visitors FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select visitors" ON public.visitors FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon update visitors" ON public.visitors FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 2. Sessions table
CREATE TABLE public.sessions (
  session_id text PRIMARY KEY,
  visitor_id text NOT NULL REFERENCES public.visitors(visitor_id) ON DELETE CASCADE,
  device text,
  utm_source text,
  utm_campaign text,
  utm_medium text,
  utm_content text,
  utm_term text,
  ttclid text,
  referrer text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon insert sessions" ON public.sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select sessions" ON public.sessions FOR SELECT TO anon USING (true);

-- 3. Events table (central)
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  session_id text,
  event_name text NOT NULL,
  value integer DEFAULT 0,
  currency text DEFAULT 'BRL',
  product_id text,
  campaign text,
  source text,
  event_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_visitor ON public.events(visitor_id);
CREATE INDEX idx_events_name ON public.events(event_name);
CREATE INDEX idx_events_created ON public.events(created_at DESC);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon insert events" ON public.events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select events" ON public.events FOR SELECT TO anon USING (true);

-- 4. Funnel state per visitor
CREATE TABLE public.funnel_state (
  visitor_id text PRIMARY KEY REFERENCES public.visitors(visitor_id) ON DELETE CASCADE,
  stage funnel_stage NOT NULL DEFAULT 'visit',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.funnel_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon insert funnel_state" ON public.funnel_state FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select funnel_state" ON public.funnel_state FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon update funnel_state" ON public.funnel_state FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 5. Orders table
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text,
  lead_id uuid,
  payment_method text NOT NULL DEFAULT 'pix',
  status order_status NOT NULL DEFAULT 'checkout_started',
  value integer DEFAULT 0,
  currency text DEFAULT 'BRL',
  transaction_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_visitor ON public.orders(visitor_id);
CREATE INDEX idx_orders_status ON public.orders(status);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon insert orders" ON public.orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select orders" ON public.orders FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon update orders" ON public.orders FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role all orders" ON public.orders FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Enable realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.funnel_state;
