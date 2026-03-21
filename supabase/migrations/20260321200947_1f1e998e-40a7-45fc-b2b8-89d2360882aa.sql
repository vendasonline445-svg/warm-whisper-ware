
-- 1. tiktok_tokens — armazena tokens OAuth do TikTok
CREATE TABLE public.tiktok_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'bearer',
  expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  advertiser_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.tiktok_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tiktok_tokens_all_auth" ON public.tiktok_tokens FOR ALL TO authenticated
  USING (current_user_role() IN ('superadmin','admin'))
  WITH CHECK (current_user_role() IN ('superadmin','admin'));

-- 2. tiktok_ad_accounts — contas de anúncio vinculadas
CREATE TABLE public.tiktok_ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  advertiser_id TEXT NOT NULL,
  advertiser_name TEXT,
  currency TEXT DEFAULT 'BRL',
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  status TEXT DEFAULT 'active',
  bc_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.tiktok_ad_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tiktok_ad_accounts_all_auth" ON public.tiktok_ad_accounts FOR ALL TO authenticated
  USING (current_user_role() IN ('superadmin','admin'))
  WITH CHECK (current_user_role() IN ('superadmin','admin'));

-- 3. launch_history — histórico de lançamentos de campanhas
CREATE TABLE public.launch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  campaign_name TEXT NOT NULL,
  campaign_external_id TEXT,
  adgroup_count INTEGER DEFAULT 0,
  ad_count INTEGER DEFAULT 0,
  budget_cents INTEGER DEFAULT 0,
  objective TEXT,
  status TEXT DEFAULT 'launched',
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.launch_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "launch_history_all_auth" ON public.launch_history FOR ALL TO authenticated
  USING (current_user_role() IN ('superadmin','admin'))
  WITH CHECK (current_user_role() IN ('superadmin','admin'));

-- 4. campaign_presets — presets salvos de configuração de campanha
CREATE TABLE public.campaign_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  preset_name TEXT NOT NULL,
  objective TEXT,
  budget_type TEXT DEFAULT 'daily',
  budget_cents INTEGER DEFAULT 0,
  targeting JSONB DEFAULT '{}'::jsonb,
  schedule JSONB DEFAULT '{}'::jsonb,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.campaign_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaign_presets_all_auth" ON public.campaign_presets FOR ALL TO authenticated
  USING (current_user_role() IN ('superadmin','admin'))
  WITH CHECK (current_user_role() IN ('superadmin','admin'));

-- 5. spark_profiles — perfis de Spark Ads autorizados
CREATE TABLE public.spark_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  tt_user_id TEXT,
  auth_code TEXT,
  display_name TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'active',
  authorized_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.spark_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spark_profiles_all_auth" ON public.spark_profiles FOR ALL TO authenticated
  USING (current_user_role() IN ('superadmin','admin'))
  WITH CHECK (current_user_role() IN ('superadmin','admin'));
