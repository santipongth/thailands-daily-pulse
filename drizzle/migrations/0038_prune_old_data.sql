CREATE OR REPLACE FUNCTION public.prune_old_data()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare cut timestamptz := now() - interval '90 days'; r jsonb := '{}'::jsonb; n int;
begin
  update raw_evidence set job_id = null where job_id in (select id from ingest_jobs where status in ('done','failed') and created_at < cut);
  update raw_evidence set last_job_id = null where last_job_id in (select id from ingest_jobs where status in ('done','failed') and created_at < cut);
  delete from ingest_jobs where status in ('done','failed') and created_at < cut; get diagnostics n = row_count; r := r || jsonb_build_object('ingest_jobs', n);
  delete from source_run_history where ran_at < cut; get diagnostics n = row_count; r := r || jsonb_build_object('source_run_history', n);
  delete from station_snapshots where received_at < cut; get diagnostics n = row_count; r := r || jsonb_build_object('station_snapshots', n);
  delete from dam_readings where read_at < cut; get diagnostics n = row_count; r := r || jsonb_build_object('dam_readings', n);
  delete from news_items where published_at < cut; get diagnostics n = row_count; r := r || jsonb_build_object('news_items', n);
  delete from social_posts where posted_at < cut; get diagnostics n = row_count; r := r || jsonb_build_object('social_posts', n);
  delete from api_rate_limits where window_start < now() - interval '1 day'; get diagnostics n = row_count; r := r || jsonb_build_object('api_rate_limits', n);
  r := jsonb_build_object('ran_at', now(), 'deleted', r);
  insert into app_settings(key, value, updated_at) values ('prune_last', r::text, now())
    on conflict (key) do update set value = excluded.value, updated_at = now();
  return r;
end $$;
REVOKE ALL ON FUNCTION public.prune_old_data() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_old_data() TO service_role;