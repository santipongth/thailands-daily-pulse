CREATE TABLE public.lottery_draws (
  draw_date date PRIMARY KEY,
  first text NOT NULL,
  last2 text,
  front3 text[],
  back3 text[],
  pdf_url text,
  video_url text,
  verified boolean NOT NULL DEFAULT false,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lottery_draws TO anon, authenticated;
GRANT ALL ON public.lottery_draws TO service_role;
ALTER TABLE public.lottery_draws ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.lottery_draws FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS vol_k numeric NOT NULL DEFAULT 2;
ALTER TABLE public.daily_briefs ADD COLUMN IF NOT EXISTS items jsonb, ADD COLUMN IF NOT EXISTS published_at timestamptz;

CREATE OR REPLACE FUNCTION public.detect_signals(_d date)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare r record; prev numeric; prev_d date; cur numeric; ch numeric; pct numeric; ratio numeric; tmul numeric;
  sev text; ttl text; bp int; bc int; n int := 0; dem boolean; chk jsonb; sd numeric; npts int; z numeric;
begin
  for r in select m.*, f.name_th as fam, f.trust from metrics m join families f on f.id = m.family_id loop
    select value, is_demo into cur, dem from observations where metric_id = r.id and observed_on = _d;
    if cur is null then continue; end if;
    select value, observed_on into prev, prev_d from observations where metric_id = r.id and observed_on < _d order by observed_on desc limit 1;
    sev := null; ch := null; pct := null; sd := null; z := null;
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
        -- normal day-to-day swing over the previous 30 observations of the same kind (real vs demo)
        select stddev_samp(d), count(d) into sd, npts from (
          select value - lag(value) over (order by observed_on) as d
          from (select value, observed_on from observations where metric_id = r.id and observed_on < _d and is_demo = dem order by observed_on desc limit 31) t
        ) x where d is not null;
        ratio := greatest(
          case when r.threshold_abs is not null and r.threshold_abs > 0 then abs(ch) / r.threshold_abs else 0 end,
          case when r.threshold_pct is not null and pct is not null then abs(pct) / r.threshold_pct else 0 end) / tmul;
        if r.min_pct is not null and (pct is null or abs(pct) < r.min_pct) then ratio := 0; end if;
        if sd is not null and sd > 0 and npts >= 10 then
          z := abs(ch) / sd;
          if z < r.vol_k then ratio := least(ratio, 0); end if;
        end if;
        if ratio >= 1 then
          ratio := greatest(ratio, coalesce(z / r.vol_k, 0));
          sev := case when ratio >= 3 then 'high' when ratio >= 1.5 then 'medium' else 'low' end;
          ttl := format('%s %s %s → %s %s', r.name_th, case when ch > 0 then 'ขึ้น' else 'ลง' end,
                        round(prev, r.decimals), round(cur, r.decimals), r.unit);
          chk := chk || jsonb_build_object('rule', 'delta', 'ratio', round(ratio, 2), 'threshold_abs', r.threshold_abs, 'threshold_pct', r.threshold_pct,
                   'min_pct', r.min_pct, 'trust_multiplier', tmul, 'sd', round(sd, 4), 'z', round(z, 2), 'vol_k', r.vol_k, 'vol_points', npts);
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