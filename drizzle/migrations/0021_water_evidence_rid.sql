CREATE OR REPLACE FUNCTION public.family_evidence_source(_family text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case _family
    when 'weather' then 'กรมอุตุฯ%' when 'air' then 'GISTDA%' when 'oil' then 'PTT%'
    when 'fx' then 'ExchangeRate%' when 'gold' then 'สมาคมค้าทองคำ%' when 'water' then '(ThaiWater|RID)%'
    when 'food' then 'CheckRaka%' when 'farm' then 'RakaKaset%' when 'traffic' then 'Longdo%'
    when 'lottery' then 'สำนักงานสลาก%'
    else null end
$function$;

CREATE OR REPLACE FUNCTION public.rank_signals(_d date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare n int; has_real boolean;
begin
  select exists(select 1 from signals where signal_date = _d and not is_demo) into has_real;
  with k as (
    select s.id, s.is_demo, f.reach,
      case s.severity when 'high' then 3 when 'medium' then 2 else 1 end::numeric as sw,
      least(2, greatest(1, coalesce((s.checks->>'z')::numeric / nullif((s.checks->>'vol_k')::numeric, 0), 1)))::numeric as zf,
      case f.trust when 'high' then 1.0 when 'medium' then 0.7 else 0.5 end::numeric as tf,
      case when exists (
        select 1 from raw_evidence e
        where e.source similar to family_evidence_source(s.family_id)
          and (e.fetched_at at time zone 'Asia/Bangkok')::date = _d
          and not exists (select 1 from raw_evidence p where p.url = e.url and p.sha256 = e.sha256 and p.fetched_at < e.fetched_at - interval '1 minute' and (p.fetched_at at time zone 'Asia/Bangkok')::date < _d)
          and exists (select 1 from raw_evidence p where p.url = e.url and p.fetched_at < e.fetched_at)
      ) then 1.0 else 0.8 end::numeric as ef
    from signals s join families f on f.id = s.family_id where s.signal_date = _d
  )
  update signals s set
    score = case when k.is_demo and has_real then 0 else round(k.sw * k.zf * k.tf * k.reach * k.ef, 3) end,
    checks = coalesce(s.checks, '{}'::jsonb) || jsonb_build_object('score', jsonb_build_object(
      'severity_weight', k.sw, 'z_factor', k.zf, 'trust_factor', k.tf, 'reach', k.reach, 'evidence_factor', k.ef,
      'demo_zeroed', k.is_demo and has_real,
      'total', case when k.is_demo and has_real then 0 else round(k.sw * k.zf * k.tf * k.reach * k.ef, 3) end))
  from k where k.id = s.id;
  get diagnostics n = row_count;
  return n;
end $function$;