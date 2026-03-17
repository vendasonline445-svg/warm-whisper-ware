
CREATE TABLE public.pushcut_destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  api_key text NOT NULL,
  notification_name text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  client_id uuid REFERENCES public.clients(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pushcut_destinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pushcut_all_auth" ON public.pushcut_destinations
  FOR ALL TO authenticated
  USING (current_user_role() IN ('superadmin', 'admin'))
  WITH CHECK (current_user_role() IN ('superadmin', 'admin'));

-- Seed existing hardcoded destinations
INSERT INTO public.pushcut_destinations (label, api_key, notification_name, events) VALUES
  ('Society Pendente', 'SpzDS98J4ESuSNvFb2HbR', 'Society Pendente ', ARRAY['pending']),
  ('Society Aprovada', 'SpzDS98J4ESuSNvFb2HbR', 'MinhaNotificação1', ARRAY['approved']),
  ('Op1 Gerado', 'hP4zcE1aQp4T4j61a5rwa', 'Gerado op1', ARRAY['pending']),
  ('Op1 Paga', 'hP4zcE1aQp4T4j61a5rwa', 'Paga op1', ARRAY['approved']),
  ('Novo Endpoint', 'W0ax72ltE-yyzA7RKNGg-', 'MinhaNotificação', ARRAY['pending', 'approved']);
