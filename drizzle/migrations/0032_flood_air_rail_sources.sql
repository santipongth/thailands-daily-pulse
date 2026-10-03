CREATE TABLE public.station_snapshots (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source text NOT NULL,
  station_id text NOT NULL,
  name text NOT NULL,
  area text,
  value numeric,
  pct numeric,
  status text,
  observed_at timestamptz,
  evidence_id bigint REFERENCES public.raw_evidence(id),
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX station_snapshots_src_recv ON public.station_snapshots (source, received_at DESC);
GRANT SELECT ON public.station_snapshots TO anon, authenticated;
GRANT ALL ON public.station_snapshots TO service_role;
ALTER TABLE public.station_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read station snapshots" ON public.station_snapshots FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.source_perf_daily (
  source text NOT NULL,
  day date NOT NULL,
  runs integer NOT NULL DEFAULT 0,
  ok integer NOT NULL DEFAULT 0,
  causes jsonb NOT NULL DEFAULT '{}'::jsonb,
  files_changed integer NOT NULL DEFAULT 0,
  median_data_age_min numeric,
  PRIMARY KEY (source, day)
);
GRANT SELECT ON public.source_perf_daily TO authenticated;
GRANT ALL ON public.source_perf_daily TO service_role;
ALTER TABLE public.source_perf_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read perf" ON public.source_perf_daily FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.source_config ADD COLUMN range_start integer, ADD COLUMN range_end integer, ADD COLUMN extra_hours integer[] NOT NULL DEFAULT '{}';

INSERT INTO public.metrics (id, family_id, name_th, unit, kind, threshold_abs, threshold_pct, bands, decimals, sort, min_pct, max_gap_days, vol_k)
SELECT 'pm25_bkk_a4t', family_id, 'PM2.5 กทม. เฉลี่ยสถานี (Air4Thai)', unit, 'level', NULL, NULL, bands, decimals, sort + 1, NULL, max_gap_days, vol_k FROM public.metrics WHERE id = 'pm25_bkk'
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.metrics (id, family_id, name_th, unit, kind, threshold_abs, threshold_pct, bands, decimals, sort, min_pct, max_gap_days, vol_k)
SELECT 'pm25_bkk_a4t_max', family_id, 'PM2.5 สถานีสูงสุดใน กทม. (Air4Thai)', unit, 'level', NULL, NULL, bands, decimals, sort + 2, NULL, max_gap_days, vol_k FROM public.metrics WHERE id = 'pm25_bkk'
ON CONFLICT (id) DO NOTHING;