CREATE TABLE public.source_config (
  source text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  schedule text NOT NULL DEFAULT 'default' CHECK (schedule IN ('default','hourly','3h','daily','manual')),
  daily_hour integer CHECK (daily_hour BETWEEN 0 AND 23),
  fetch_mode text NOT NULL DEFAULT 'default' CHECK (fetch_mode IN ('default','auto','direct','firecrawl')),
  max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 6),
  retry_delay_min integer CHECK (retry_delay_min BETWEEN 1 AND 240),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.source_config TO authenticated;
GRANT ALL ON public.source_config TO service_role;
ALTER TABLE public.source_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read source config" ON public.source_config FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));