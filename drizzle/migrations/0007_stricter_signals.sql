CREATE TABLE public.source_run_history (
  id bigserial PRIMARY KEY,
  source text NOT NULL,
  ran_at timestamptz NOT NULL DEFAULT now(),
  ok boolean NOT NULL,
  rows integer NOT NULL DEFAULT 0,
  error text
);
CREATE INDEX source_run_history_ran_at_idx ON public.source_run_history (ran_at DESC);
GRANT SELECT ON public.source_run_history TO anon, authenticated;
GRANT ALL ON public.source_run_history TO service_role;
GRANT USAGE ON SEQUENCE public.source_run_history_id_seq TO service_role;
ALTER TABLE public.source_run_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.source_run_history FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS min_pct numeric, ADD COLUMN IF NOT EXISTS max_gap_days integer NOT NULL DEFAULT 7;
ALTER TABLE public.families ADD COLUMN IF NOT EXISTS trust text NOT NULL DEFAULT 'high';
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS checks jsonb;
ALTER TABLE public.gov_changes ADD COLUMN IF NOT EXISTS pct numeric;

UPDATE public.families SET trust = 'medium' WHERE id IN ('fx','air');
UPDATE public.families SET trust = 'low' WHERE is_live = false;
UPDATE public.metrics SET max_gap_days = 45 WHERE kind = 'release';
UPDATE public.metrics SET min_pct = 0.3 WHERE id IN ('gold_bar','gold_orn');

CREATE OR REPLACE FUNCTION public.detect_signals(_d date)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare r record; prev numeric; prev_d date; cur numeric; ch numeric; pct numeric; ratio numeric; tmul numeric;
  sev text; ttl text; bp int; bc int; n int := 0; dem boolean; chk jsonb;
begin
  for r in select m.*, f.name_th as fam, f.trust from metrics m join families f on f.id = m.family_id loop
    select value, is_demo into cur, dem from observations where metric_id = r.id and observed_on = _d;
    if cur is null then continue; end if;
    select value, observed_on into prev, prev_d from observations where metric_id = r.id and observed_on < _d order by observed_on desc limit 1;
    sev := null; ch := null; pct := null;
    tmul := case r.trust when 'medium' then 1.5 else 1 end;
    chk := jsonb_build_object('trust', r.trust, 'compared_with', prev_d, 'gap_days', case when prev_d is null then null else _d - prev_d end, 'max_gap_days', r.max_gap_days, 'demo', dem);
    if prev_d is not null and (_d - prev_d) > r.max_gap_days and r.kind <> 'release' then
      delete from signals where metric_id = r.id and signal_date = _d; continue;
    end if;
    if r.kind = 'release' then
      ch := case when prev is null then null else cur - prev end;
      sev := 'medium';
      ttl := format('%s ประกาศใหม่: %s %s', r.name_th, round(cur, r.decimals), r.unit);
      chk := chk || jsonb_build_object('rule', 'release');
    elsif prev is not null then
      ch := cur - prev;
      pct := case when prev = 0 then null else ch / abs(prev) * 100 end;
      if r.kind = 'level' then
        select count(*) into bp from unnest(r.bands) b where prev >= b;
        select count(*) into bc from unnest(r.bands) b where cur >= b;
        if bc <> bp then
          sev := case when bc >= 2 then 'high' when bc > bp then 'medium' else 'low' end;
          ttl := format('%s %s ระดับ: %s → %s %s', r.name_th, case when bc > bp then 'ข้าม' else 'ลดลงต่ำกว่า' end,
                        round(prev, r.decimals), round(cur, r.decimals), r.unit);
          chk := chk || jsonb_build_object('rule', 'level', 'bands', r.bands);
        end if;
      else
        ratio := greatest(
          case when r.threshold_abs is not null and r.threshold_abs > 0 then abs(ch) / r.threshold_abs else 0 end,
          case when r.threshold_pct is not null and pct is not null then abs(pct) / r.threshold_pct else 0 end) / tmul;
        if r.min_pct is not null and (pct is null or abs(pct) < r.min_pct) then ratio := 0; end if;
        if ratio >= 1 then
          sev := case when ratio >= 3 then 'high' when ratio >= 1.5 then 'medium' else 'low' end;
          ttl := format('%s %s %s → %s %s', r.name_th, case when ch > 0 then 'ขึ้น' else 'ลง' end,
                        round(prev, r.decimals), round(cur, r.decimals), r.unit);
          chk := chk || jsonb_build_object('rule', 'delta', 'ratio', round(ratio, 2), 'threshold_abs', r.threshold_abs, 'threshold_pct', r.threshold_pct, 'min_pct', r.min_pct, 'trust_multiplier', tmul);
        end if;
      end if;
    end if;
    if sev is not null and dem and sev = 'high' then sev := 'medium'; chk := chk || '{"capped":"demo"}'::jsonb; end if;
    if sev is not null then
      insert into signals (family_id, metric_id, signal_date, severity, title, prev_value, new_value, change_abs, change_pct, is_demo, checks)
      values (r.family_id, r.id, _d, sev, ttl, prev, cur, ch, pct, dem, chk)
      on conflict (metric_id, signal_date) do update set severity = excluded.severity, title = excluded.title,
        prev_value = excluded.prev_value, new_value = excluded.new_value, change_abs = excluded.change_abs,
        change_pct = excluded.change_pct, is_demo = excluded.is_demo, checks = excluded.checks;
      n := n + 1;
    else
      delete from signals where metric_id = r.id and signal_date = _d;
    end if;
  end loop;
  return n;
end $function$;