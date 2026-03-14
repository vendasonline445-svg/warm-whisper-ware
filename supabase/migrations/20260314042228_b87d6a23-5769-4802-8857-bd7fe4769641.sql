
-- Add unique constraints for upsert operations
CREATE UNIQUE INDEX IF NOT EXISTS creative_metrics_creative_id_key ON public.creative_metrics (creative_id);
CREATE UNIQUE INDEX IF NOT EXISTS funnel_diagnostics_client_id_key ON public.funnel_diagnostics (client_id);
