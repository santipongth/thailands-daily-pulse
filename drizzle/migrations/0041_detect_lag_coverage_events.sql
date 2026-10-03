COMMENT ON COLUMN public.metrics.lag_days IS 'Days a published value may trail the brief date (from real arrival times, refresh_metric_lag)';
COMMENT ON COLUMN public.metrics.expected_days IS 'Readings expected per 7 days (5 = weekday agency); sparse weeks raise the weekly threshold';

CREATE OR REPLACE FUNCTION public.refresh_metric_lag()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
declare res jsonb := '{}'::jsonb; r record;
begin
  for r in
    with live as (
      select o.metric_id, ((o.received_at at time zone 'Asia/Bangkok')::date - o.observed_on) as lag
      from observations o
      where o.is_demo = false and o.received_at > now() - interval '60 days'
        and (o.metric_id, date_trunc('minute', o.received_at)) in (
          select metric_id, date_trunc('minute', received_at) from observations
          where received_at > now() - interval '60 days' group by 1, 2 having count(*) = 1)
    )
    select l.metric_id, count(*) n, ceil(percentile_cont(0.9) within group (order by greatest(l.lag, 0)))::int p90
    from live l join metrics m on m.id = l.metric_id where m.weekly group by l.metric_id
  loop
    if r.n >= 5 then
      update metrics set lag_days = least(greatest(r.p90, 1), 7) where id = r.metric_id;
      res := res || jsonb_build_object(r.metric_id, least(greatest(r.p90, 1), 7));
    end if;
  end loop;
  return res;
end $$;
REVOKE ALL ON FUNCTION public.refresh_metric_lag() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_metric_lag() TO service_role;

CREATE OR REPLACE FUNCTION public.family_evidence_source(_family text)
 RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $function$
  select case _family
    when 'weather' then 'กรมอุตุฯ%' when 'air' then 'GISTDA%' when 'oil' then 'PTT%'
    when 'fx' then 'ExchangeRate%' when 'gold' then 'สมาคมค้าทองคำ%' when 'water' then '(ThaiWater|RID|กทม.|ปภ.)%'
    when 'food' then '(CheckRaka|กรมการค้าภายใน)%' when 'farm' then 'RakaKaset%' when 'traffic' then 'Longdo%'
    when 'lottery' then 'สำนักงานสลาก%' when 'utility' then 'การไฟฟ้า%' when 'rail' then 'รถไฟฟ้า%'
    else null end
$function$;

CREATE OR REPLACE FUNCTION public.detect_core(_d date, _cutoff timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(family_id text, metric_id text, severity text, title text, prev_value numeric, new_value numeric, change_abs numeric, change_pct numeric, is_demo boolean, checks jsonb, has_obs boolean)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare r record; prev numeric; prev_d date; cur numeric; cur_d date; ch numeric; pct numeric; ratio numeric; tmul numeric;
  sev text; ttl text; bp int; bc int; dem boolean; chk jsonb; sd numeric; npts int; z numeric;
  cavg numeric; pavg numeric; cn int; pn int; wpct numeric; wr numeric; wsev text; cf numeric; lagd int;
begin
  for r in select m.*, f.trust from metrics m join families f on f.id = m.family_id loop
    cur := null; cur_d := null;
    lagd := case when r.weekly then greatest(r.lag_days, 1) else 0 end;
    select o.value, o.is_demo, o.observed_on into cur, dem, cur_d from observations o
      where o.metric_id = r.id and o.observed_on between _d - lagd and _d
        and (_cutoff is null or o.received_at <= _cutoff)
      order by o.observed_on desc limit 1;
    if cur is null then continue; end if;
    prev := null; prev_d := null;
    select o.value, o.observed_on into prev, prev_d from observations o where o.metric_id = r.id and o.observed_on < cur_d and (_cutoff is null or o.received_at <= _cutoff) order by o.observed_on desc limit 1;
    sev := null; ch := null; pct := null; sd := null; z := null;
    tmul := case r.trust when 'medium' then 1.5 else 1 end;
    chk := jsonb_build_object('trust', r.trust, 'compared_with', prev_d, 'gap_days', case when prev_d is null then null else cur_d - prev_d end, 'max_gap_days', r.max_gap_days, 'demo', dem, 'price_date', cur_d, 'lag_days', lagd);
    if r.kind = 'events' then
      if cur >= r.bands[1] then
        sev := case when array_length(r.bands, 1) >= 2 and cur >= r.bands[2] then 'high' else 'medium' end;
        ttl := format('%s %s ครั้ง', r.name_th, round(cur, 0));
        chk := chk || jsonb_build_object('rule', 'events', 'bands', r.bands, 'count', cur);
      end if;
      family_id := r.family_id; metric_id := r.id; severity := sev; title := ttl; prev_value := prev; new_value := cur;
      change_abs := case when prev is null then null else cur - prev end; change_pct := null; is_demo := dem; checks := chk; has_obs := true;
      return next; continue;
    end if;
    if prev_d is not null and (cur_d - prev_d) > r.max_gap_days and r.kind <> 'release' then
      family_id := r.family_id; metric_id := r.id; severity := null; has_obs := true; return next; continue;
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
          ttl := format('%s %s ระดับ: %s → %s %s', r.name_th, case when bc > bp then 'ข้าม' else 'ลดลงต่ำกว่า' end, round(prev, r.decimals), round(cur, r.decimals), r.unit);
          chk := chk || jsonb_build_object('rule', 'level', 'bands', r.bands);
        end if;
      else
        select stddev_samp(d), count(d) into sd, npts from (
          select t.value - lag(t.value) over (order by t.observed_on) as d
          from (select o.value, o.observed_on from observations o where o.metric_id = r.id and o.observed_on < cur_d and o.is_demo = dem and (_cutoff is null or o.received_at <= _cutoff) order by o.observed_on desc limit 31) t
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
          ttl := format('%s %s %s → %s %s', r.name_th, case when ch > 0 then 'ขึ้น' else 'ลง' end, round(prev, r.decimals), round(cur, r.decimals), r.unit);
          chk := chk || jsonb_build_object('rule', 'delta', 'ratio', round(ratio, 2), 'threshold_abs', r.threshold_abs, 'threshold_pct', r.threshold_pct,
                   'min_pct', r.min_pct, 'trust_multiplier', tmul, 'sd', round(sd, 4), 'z', round(z, 2), 'vol_k', r.vol_k, 'vol_points', npts);
        end if;
      end if;
    end if;
    if r.weekly and r.kind = 'delta' and r.threshold_pct is not null then
      select avg(o.value), count(*) into cavg, cn from observations o where o.metric_id = r.id and o.is_demo = dem
        and o.observed_on between cur_d - 6 and cur_d and (_cutoff is null or o.received_at <= _cutoff);
      select avg(o.value), count(*) into pavg, pn from observations o where o.metric_id = r.id and o.is_demo = dem
        and o.observed_on between cur_d - 13 and cur_d - 7 and (_cutoff is null or o.received_at <= _cutoff);
      if cn >= 3 and pn >= 3 and pavg <> 0 then
        cf := greatest(1, sqrt(r.expected_days::numeric / least(cn, pn)));
        wpct := (cavg - pavg) / abs(pavg) * 100;
        wr := abs(wpct) / (r.threshold_pct * cf) / tmul;
        if wr >= 1 then
          wsev := case when wr >= 3 then 'high' when wr >= 1.5 then 'medium' else 'low' end;
          if sev is null or (case wsev when 'high' then 3 when 'medium' then 2 else 1 end) > (case sev when 'high' then 3 when 'medium' then 2 when 'low' then 1 else 0 end) then
            sev := wsev; prev := round(pavg, 2); cur := round(cavg, 2); ch := cavg - pavg; pct := wpct; z := null;
            ttl := format('%s เฉลี่ยสัปดาห์นี้ %s %s %s%% จากสัปดาห์ก่อน %s %s', r.name_th, round(cavg, r.decimals), case when wpct > 0 then 'ขึ้น' else 'ลดลง' end, round(abs(wpct), 1), round(pavg, r.decimals), r.unit);
            chk := chk || jsonb_build_object('rule', 'weekly', 'ratio', round(wr, 2), 'threshold_pct', r.threshold_pct, 'trust_multiplier', tmul,
                     'coverage_factor', round(cf, 3), 'expected_days', r.expected_days, 'effective_threshold_pct', round(r.threshold_pct * cf * tmul, 2),
                     'cur_avg', round(cavg, 4), 'prev_avg', round(pavg, 4), 'days_cur', cn, 'days_prev', pn, 'pct', round(wpct, 2),
                     'cur_from', cur_d - 6, 'cur_to', cur_d, 'prev_from', cur_d - 13, 'prev_to', cur_d - 7);
          end if;
        end if;
      end if;
    end if;
    if sev is not null and dem and sev = 'high' then sev := 'medium'; chk := chk || '{"capped":"demo"}'::jsonb; end if;
    family_id := r.family_id; metric_id := r.id; severity := sev; title := ttl; prev_value := prev; new_value := cur;
    change_abs := ch; change_pct := pct; is_demo := dem; checks := chk; has_obs := true;
    return next;
  end loop;
end $function$;