
-- Clients table
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  contact_email text,
  contact_phone text,
  notes text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select clients" ON public.clients FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert clients" ON public.clients FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update clients" ON public.clients FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete clients" ON public.clients FOR DELETE TO anon USING (true);

-- Business Centers table
CREATE TABLE public.business_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  bc_name text NOT NULL,
  bc_external_id text,
  platform text NOT NULL DEFAULT 'tiktok',
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select business_centers" ON public.business_centers FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert business_centers" ON public.business_centers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update business_centers" ON public.business_centers FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete business_centers" ON public.business_centers FOR DELETE TO anon USING (true);

-- Add client_id to campaigns for multi-tenant support
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- API logs table
CREATE TABLE public.api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  endpoint text NOT NULL,
  method text NOT NULL DEFAULT 'GET',
  request_payload jsonb DEFAULT '{}'::jsonb,
  response_payload jsonb DEFAULT '{}'::jsonb,
  status_code integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select api_logs" ON public.api_logs FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert api_logs" ON public.api_logs FOR INSERT TO anon WITH CHECK (true);
