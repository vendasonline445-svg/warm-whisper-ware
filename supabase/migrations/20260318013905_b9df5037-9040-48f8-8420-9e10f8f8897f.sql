-- Add unique constraint on campaign_external_id for upserts
CREATE UNIQUE INDEX IF NOT EXISTS campaigns_external_id_unique ON public.campaigns (campaign_external_id) WHERE campaign_external_id IS NOT NULL;

-- Add composite unique on campaign_costs for upsert by campaign+date
CREATE UNIQUE INDEX IF NOT EXISTS campaign_costs_campaign_date_unique ON public.campaign_costs (campaign_id, date);

-- Add advertiser_id column to business_centers
ALTER TABLE public.business_centers ADD COLUMN IF NOT EXISTS advertiser_id text;