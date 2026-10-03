-- Scheduled jobs (pg_cron + pg_net). Times are UTC; comments show Asia/Bangkok (UTC+7).
-- Before running, replace:
--   YOUR_SITE_URL     e.g. https://signals.example.org   (no trailing slash)
--   YOUR_CRON_SECRET  the same value as the LOVABLE_CRON_SECRET server setting
-- scripts/setup-db.sh does this replacement for you from SITE_URL / CRON_SECRET.
-- Without pg_cron you can call the same URLs from any external scheduler (see docs/operations.md).

DO $$
DECLARE j text;
BEGIN
  FOREACH j IN ARRAY ARRAY['brief-freeze-0545','brief-publish-0555','gov-daily-0530','ingest-dams-hourly',
    'ingest-early-0010','ingest-early-0300','ingest-early-0500','ingest-hourly','ingest-social-30m','metric-lag','prune-90d']
  LOOP
    PERFORM cron.unschedule(j) WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = j);
  END LOOP;
END $$;

-- Helper: POST to the app with the scheduler secret.
CREATE OR REPLACE FUNCTION public.tds_cron_post(_path text) RETURNS bigint LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT net.http_post(
    url := 'YOUR_SITE_URL' || _path,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer YOUR_CRON_SECRET'),
    body := '{}'::jsonb,
    timeout_milliseconds := 290000);
$$;
REVOKE ALL ON FUNCTION public.tds_cron_post(text) FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('ingest-hourly',      '5 * * * *',     $$SELECT public.tds_cron_post('/api/public/ingest')$$);                -- every hour :05 (+ custom admin times, TMD catch-up)
SELECT cron.schedule('ingest-dams-hourly', '20 * * * *',    $$SELECT public.tds_cron_post('/api/public/ingest?mode=dams')$$);      -- every hour :20
SELECT cron.schedule('ingest-social-30m',  '*/30 * * * *',  $$SELECT public.tds_cron_post('/api/public/ingest?mode=social')$$);    -- every 30 min (FM91/X, custom schedules)
SELECT cron.schedule('ingest-early-0010',  '10 17 * * *',   $$SELECT public.tds_cron_post('/api/public/ingest?mode=early')$$);     -- 00:10 Bangkok
SELECT cron.schedule('ingest-early-0300',  '0 20 * * *',    $$SELECT public.tds_cron_post('/api/public/ingest?mode=early')$$);     -- 03:00 Bangkok
SELECT cron.schedule('ingest-early-0500',  '0 22 * * *',    $$SELECT public.tds_cron_post('/api/public/ingest?mode=early')$$);     -- 05:00 Bangkok
SELECT cron.schedule('gov-daily-0530',     '30 22 * * *',   $$SELECT public.tds_cron_post('/api/public/ingest?mode=daily')$$);     -- 05:30 Bangkok full run
SELECT cron.schedule('brief-freeze-0545',  '45 22 * * *',   $$SELECT public.tds_cron_post('/api/public/brief?step=freeze')$$);     -- 05:45 Bangkok data cutoff
SELECT cron.schedule('brief-publish-0555', '55,58 22 * * *',$$SELECT public.tds_cron_post('/api/public/brief?step=publish')$$);    -- 05:55 (+05:58 retry) publish
SELECT cron.schedule('prune-90d',          '30 20 * * *',   $$SELECT public.prune_old_data()$$);                                   -- 03:30 Bangkok retention
SELECT cron.schedule('metric-lag',         '35 20 * * *',   $$SELECT public.refresh_metric_lag()$$);                               -- 03:35 Bangkok arrival-lag refresh
