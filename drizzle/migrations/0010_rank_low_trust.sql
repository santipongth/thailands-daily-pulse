CREATE OR REPLACE FUNCTION public.rank_signals(_d date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare n int;
begin
  update signals s set
    score = round(sw * zf * tf * f.reach, 3),
    checks = coalesce(s.checks, '{}'::jsonb) || jsonb_build_object('score', jsonb_build_object(
      'severity_weight', sw, 'z_factor', zf, 'trust_factor', tf, 'reach', f.reach, 'total', round(sw * zf * tf * f.reach, 3)))
  from families f,
  lateral (select case s.severity when 'high' then 3 when 'medium' then 2 else 1 end::numeric as sw,
    least(2, greatest(1, coalesce((s.checks->>'z')::numeric / nullif((s.checks->>'vol_k')::numeric, 0), 1)))::numeric as zf,
    case f.trust when 'high' then 1.0 when 'medium' then 0.7 else 0.5 end::numeric as tf) k
  where f.id = s.family_id and s.signal_date = _d;
  get diagnostics n = row_count;
  return n;
end $$;
REVOKE EXECUTE ON FUNCTION public.rank_signals(date) FROM anon, authenticated;