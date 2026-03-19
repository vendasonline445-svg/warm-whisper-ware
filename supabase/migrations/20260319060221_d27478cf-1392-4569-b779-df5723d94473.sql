
-- Add conversion and video metrics columns to campaign_costs
ALTER TABLE public.campaign_costs
ADD COLUMN IF NOT EXISTS conversions integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_per_conversion numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS real_time_conversions integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS real_time_cost_per_conversion numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_views_p25 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_views_p50 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_views_p75 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_views_p100 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_video_play numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS likes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS shares integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS follows integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS profile_visits integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS reach integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS frequency numeric DEFAULT 0;
