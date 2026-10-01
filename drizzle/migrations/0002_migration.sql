
-- Anchor illustrative history of live metrics to today's real value so the first live reading doesn't look like a fake jump.
with live as (select metric_id, observed_on, value from public.observations where not is_demo),
prev as (
  select l.metric_id, l.value as lv,
    (select o.value from public.observations o where o.metric_id = l.metric_id and o.is_demo and o.observed_on < l.observed_on order by o.observed_on desc limit 1) as dv
  from live l)
update public.observations o set value = round(o.value * (p.lv / p.dv), 3)
from prev p where o.metric_id = p.metric_id and o.is_demo and p.dv is not null and p.dv <> 0;

delete from public.signals where is_demo and metric_id in (select distinct metric_id from public.observations where not is_demo);
do $$ declare d int; t date := (now() at time zone 'Asia/Bangkok')::date; begin
  for d in reverse 29..0 loop perform public.detect_signals(t - d); end loop;
end $$;
delete from public.daily_briefs;
