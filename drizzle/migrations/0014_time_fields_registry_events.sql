-- Source registry
CREATE TABLE public.source_registry (
  source text PRIMARY KEY,
  owner text NOT NULL,
  channel text NOT NULL,
  licence text NOT NULL DEFAULT 'ไม่ระบุ',
  cadence text NOT NULL,
  unit text NOT NULL DEFAULT '',
  area text NOT NULL DEFAULT 'ประเทศไทย',
  stale_after_days integer NOT NULL DEFAULT 2,
  url text,
  sort integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.source_registry TO anon, authenticated;
GRANT ALL ON public.source_registry TO service_role;
ALTER TABLE public.source_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.source_registry FOR SELECT TO anon, authenticated USING (true);

-- Four times on every observation
ALTER TABLE public.observations
  ADD COLUMN period_start date,
  ADD COLUMN period_end date,
  ADD COLUMN published_at timestamptz,
  ADD COLUMN received_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN effective_from date,
  ADD COLUMN evidence_id bigint REFERENCES public.raw_evidence(id) ON DELETE SET NULL;
UPDATE public.observations SET period_start = observed_on, period_end = observed_on, effective_from = observed_on, received_at = created_at;
COMMENT ON COLUMN public.observations.observed_on IS 'Date the value refers to (= period_end)';

-- Event registry
CREATE TABLE public.signal_events (
  event_id text PRIMARY KEY,
  metric_id text NOT NULL REFERENCES public.metrics(id),
  family_id text NOT NULL REFERENCES public.families(id),
  event_type text NOT NULL,
  area text NOT NULL DEFAULT 'ประเทศไทย',
  signal_date date NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_version integer NOT NULL DEFAULT 1,
  is_demo boolean NOT NULL DEFAULT false,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.signal_versions (
  id bigserial PRIMARY KEY,
  event_id text NOT NULL REFERENCES public.signal_events(event_id) ON DELETE CASCADE,
  version integer NOT NULL,
  change_kind text NOT NULL,
  severity text,
  title text,
  prev_value numeric,
  new_value numeric,
  prev_date date,
  new_date date,
  rules jsonb,
  evidence_ids bigint[] NOT NULL DEFAULT '{}',
  impact jsonb,
  advice text,
  quality text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, version)
);
GRANT SELECT ON public.signal_events, public.signal_versions TO anon, authenticated;
GRANT ALL ON public.signal_events, public.signal_versions TO service_role;
GRANT USAGE ON SEQUENCE public.signal_versions_id_seq TO service_role;
ALTER TABLE public.signal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.signal_events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read" ON public.signal_versions FOR SELECT TO anon, authenticated USING (true);

-- Brief edition fields + timestamped updates/corrections
ALTER TABLE public.daily_briefs ADD COLUMN cutoff_at timestamptz, ADD COLUMN edition integer NOT NULL DEFAULT 1, ADD COLUMN completeness jsonb;
CREATE TABLE public.brief_updates (
  id bigserial PRIMARY KEY,
  brief_date date NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  event_id text,
  version integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.brief_updates TO anon, authenticated;
GRANT ALL ON public.brief_updates TO service_role;
GRANT USAGE ON SEQUENCE public.brief_updates_id_seq TO service_role;
ALTER TABLE public.brief_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.brief_updates FOR SELECT TO anon, authenticated USING (true);

-- Version recorder: a new version only when content changes; deletion = withdrawal
CREATE OR REPLACE FUNCTION public.record_signal_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare s record; eid text; lv record; ev bigint[]; q text; kind text;
begin
  s := case when tg_op = 'DELETE' then old else new end;
  eid := s.metric_id || ':' || s.signal_date;
  select * into lv from signal_versions where event_id = eid order by version desc limit 1;
  if tg_op = 'DELETE' then
    if lv.id is not null and lv.change_kind <> 'withdrawn' then
      insert into signal_versions (event_id, version, change_kind, severity, title, prev_value, new_value, prev_date, new_date, rules, evidence_ids, quality, reason)
      values (eid, lv.version + 1, 'withdrawn', lv.severity, lv.title, lv.prev_value, lv.new_value, lv.prev_date, lv.new_date, lv.rules, lv.evidence_ids, lv.quality, 'ข้อมูลรอบใหม่ไม่ผ่านเกณฑ์แล้ว — ถอนสัญญาณ');
      update signal_events set status = 'withdrawn', current_version = lv.version + 1, updated_at = now() where event_id = eid;
    end if;
    return old;
  end if;
  if lv.id is not null and lv.change_kind <> 'withdrawn' and lv.severity is not distinct from s.severity and lv.title is not distinct from s.title
     and lv.prev_value is not distinct from s.prev_value and lv.new_value is not distinct from s.new_value then
    update signal_versions set rules = s.checks where id = lv.id; -- score/rank refresh, same event content
    return new;
  end if;
  select coalesce(array_agg(id), '{}') into ev from (
    select id from raw_evidence where source like family_evidence_source(s.family_id)
      and (fetched_at at time zone 'Asia/Bangkok')::date = s.signal_date order by id desc limit 5) x;
  q := case when s.is_demo then 'demo' when cardinality(ev) > 0 then 'verified' else 'cannot_verify' end;
  kind := case when lv.id is null then 'new' when lv.change_kind = 'withdrawn' then 'reinstated' else 'corrected' end;
  insert into signal_events (event_id, metric_id, family_id, event_type, signal_date, is_demo)
  values (eid, s.metric_id, s.family_id, coalesce(s.checks->>'rule', 'delta'), s.signal_date, s.is_demo)
  on conflict (event_id) do nothing;
  insert into signal_versions (event_id, version, change_kind, severity, title, prev_value, new_value, prev_date, new_date, rules, evidence_ids, quality, reason)
  values (eid, coalesce(lv.version, 0) + 1, kind, s.severity, s.title, s.prev_value, s.new_value,
          nullif(s.checks->>'compared_with', '')::date, s.signal_date, s.checks, ev, q,
          case kind when 'new' then null when 'reinstated' then 'กลับมาผ่านเกณฑ์อีกครั้ง' else format('ค่าเปลี่ยนจาก %s เป็น %s', lv.new_value, s.new_value) end);
  update signal_events set status = case when kind = 'corrected' then 'corrected' else 'active' end, current_version = coalesce(lv.version, 0) + 1, updated_at = now() where event_id = eid;
  return new;
end $$;
CREATE TRIGGER signals_versioning AFTER INSERT OR UPDATE OR DELETE ON public.signals FOR EACH ROW EXECUTE FUNCTION public.record_signal_version();

-- Backfill events for existing signals
INSERT INTO public.signal_events (event_id, metric_id, family_id, event_type, signal_date, is_demo, first_seen_at)
SELECT metric_id || ':' || signal_date, metric_id, family_id, coalesce(checks->>'rule', 'delta'), signal_date, is_demo, created_at FROM public.signals
ON CONFLICT DO NOTHING;
INSERT INTO public.signal_versions (event_id, version, change_kind, severity, title, prev_value, new_value, prev_date, new_date, rules, quality, created_at)
SELECT metric_id || ':' || signal_date, 1, 'new', severity, title, prev_value, new_value, nullif(checks->>'compared_with', '')::date, signal_date, checks,
  case when is_demo then 'demo' else 'cannot_verify' end, created_at FROM public.signals
ON CONFLICT DO NOTHING;

-- Detection core: pure, optionally limited to what the system had received by _cutoff (replay)
CREATE OR REPLACE FUNCTION public.detect_core(_d date, _cutoff timestamptz DEFAULT NULL)
RETURNS TABLE (family_id text, metric_id text, severity text, title text, prev_value numeric, new_value numeric, change_abs numeric, change_pct numeric, is_demo boolean, checks jsonb, has_obs boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare r record; prev numeric; prev_d date; cur numeric; ch numeric; pct numeric; ratio numeric; tmul numeric;
  sev text; ttl text; bp int; bc int; dem boolean; chk jsonb; sd numeric; npts int; z numeric;
begin
  for r in select m.*, f.trust from metrics m join families f on f.id = m.family_id loop
    cur := null;
    select o.value, o.is_demo into cur, dem from observations o where o.metric_id = r.id and o.observed_on = _d and (_cutoff is null or o.received_at <= _cutoff);
    if cur is null then continue; end if;
    prev := null; prev_d := null;
    select o.value, o.observed_on into prev, prev_d from observations o where o.metric_id = r.id and o.observed_on < _d and (_cutoff is null or o.received_at <= _cutoff) order by o.observed_on desc limit 1;
    sev := null; ch := null; pct := null; sd := null; z := null;
    tmul := case r.trust when 'medium' then 1.5 else 1 end;
    chk := jsonb_build_object('trust', r.trust, 'compared_with', prev_d, 'gap_days', case when prev_d is null then null else _d - prev_d end, 'max_gap_days', r.max_gap_days, 'demo', dem);
    if prev_d is not null and (_d - prev_d) > r.max_gap_days and r.kind <> 'release' then
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
          from (select o.value, o.observed_on from observations o where o.metric_id = r.id and o.observed_on < _d and o.is_demo = dem and (_cutoff is null or o.received_at <= _cutoff) order by o.observed_on desc limit 31) t
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
    if sev is not null and dem and sev = 'high' then sev := 'medium'; chk := chk || '{"capped":"demo"}'::jsonb; end if;
    family_id := r.family_id; metric_id := r.id; severity := sev; title := ttl; prev_value := prev; new_value := cur;
    change_abs := ch; change_pct := pct; is_demo := dem; checks := chk; has_obs := true;
    return next;
  end loop;
end $function$;

CREATE OR REPLACE FUNCTION public.detect_signals(_d date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare c record; n int := 0;
begin
  for c in select * from detect_core(_d, null) loop
    if c.severity is null then
      delete from signals where metric_id = c.metric_id and signal_date = _d;
    else
      insert into signals (family_id, metric_id, signal_date, severity, title, prev_value, new_value, change_abs, change_pct, is_demo, checks)
      values (c.family_id, c.metric_id, _d, c.severity, c.title, c.prev_value, c.new_value, c.change_abs, c.change_pct, c.is_demo, c.checks)
      on conflict (metric_id, signal_date) do update set severity = excluded.severity, title = excluded.title,
        prev_value = excluded.prev_value, new_value = excluded.new_value, change_abs = excluded.change_abs,
        change_pct = excluded.change_pct, is_demo = excluded.is_demo, checks = excluded.checks;
      n := n + 1;
    end if;
  end loop;
  return n;
end $function$;

-- Replay: what detection would have produced with only data received by 05:45 Bangkok that day
CREATE OR REPLACE FUNCTION public.replay_signals(_d date)
RETURNS TABLE (metric_id text, severity text, title text, prev_value numeric, new_value numeric, is_demo boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  select c.metric_id, c.severity, c.title, c.prev_value, c.new_value, c.is_demo
  from detect_core(_d, ((_d + time '05:45') at time zone 'Asia/Bangkok')) c where c.severity is not null
$$;
GRANT EXECUTE ON FUNCTION public.replay_signals(date) TO anon, authenticated;