CREATE TABLE public.order_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.checkout_leads(id) ON DELETE CASCADE NOT NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  product_name text NOT NULL DEFAULT 'Mesa Portátil Dobrável',
  zipcode text,
  tracking_code text,
  tracking_url text,
  status text NOT NULL DEFAULT 'enviado',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.order_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role all" ON public.order_tracking FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon select" ON public.order_tracking FOR SELECT TO anon USING (true);