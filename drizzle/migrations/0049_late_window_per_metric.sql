ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS late_window_days integer NOT NULL DEFAULT 2;

UPDATE public.metrics m SET late_window_days = CASE
  WHEN m.id = 'lpg' THEN 45
  WHEN m.family_id = 'oil' THEN 7
  WHEN m.family_id = 'labour' THEN 730
  WHEN m.family_id = 'utility' THEN 45
  WHEN m.family_id = 'farm' THEN greatest(3, m.lag_days + 1)
  WHEN m.weekly THEN greatest(m.lag_days + 1, 2, m.expected_days)
  ELSE greatest(2, m.lag_days + 1) END;

COMMENT ON COLUMN public.metrics.late_window_days IS 'Days after the data date a late-arriving reading may still create a signal on its arrival day';

CREATE OR REPLACE FUNCTION public.detect_received_signals(_d date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r record; c record; n integer := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT ON (o.metric_id) o.metric_id, o.observed_on, o.received_at, o.effective_from, o.evidence_id,
      m.late_window_days AS allowed_days
    FROM public.observations o JOIN public.metrics m ON m.id = o.metric_id
    WHERE o.is_demo = false
      AND o.received_at >= (_d::timestamp at time zone 'Asia/Bangkok')
      AND o.received_at < ((_d + 1)::timestamp at time zone 'Asia/Bangkok')
      AND o.observed_on < _d
      AND (m.threshold_abs IS NOT NULL OR m.threshold_pct IS NOT NULL OR m.bands IS NOT NULL OR m.kind = 'release')
    ORDER BY o.metric_id, o.observed_on DESC
  LOOP
    IF _d - r.observed_on > r.allowed_days THEN CONTINUE; END IF;
    SELECT * INTO c FROM public.detect_core(r.observed_on, r.received_at)
      WHERE metric_id = r.metric_id AND severity IS NOT NULL AND is_demo = false;
    IF NOT FOUND THEN CONTINUE; END IF;
    -- One row per metric/day: a same-day signal is only replaced when the late one is more severe.
    INSERT INTO public.signals (family_id, metric_id, signal_date, severity, title, prev_value, new_value, change_abs, change_pct, is_demo, checks)
    VALUES (c.family_id, c.metric_id, _d, c.severity, c.title, c.prev_value, c.new_value, c.change_abs, c.change_pct, false,
      c.checks || jsonb_build_object('data_date', r.observed_on, 'received_at', r.received_at,
         'effective_from', r.effective_from, 'evidence_id', r.evidence_id,
         'arrival_day', _d, 'arrival_lag_days', _d - r.observed_on, 'late_window_days', r.allowed_days,
         'arrival_rule', 'late_above_threshold'))
    ON CONFLICT (metric_id, signal_date) DO UPDATE SET
      severity = EXCLUDED.severity, title = EXCLUDED.title, prev_value = EXCLUDED.prev_value,
      new_value = EXCLUDED.new_value, change_abs = EXCLUDED.change_abs, change_pct = EXCLUDED.change_pct,
      is_demo = false, checks = EXCLUDED.checks
    WHERE (CASE EXCLUDED.severity WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END) >
      (CASE signals.severity WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END)
      OR (signals.checks->>'arrival_rule' = 'late_above_threshold' AND signals.checks IS DISTINCT FROM EXCLUDED.checks
          AND signals.severity = EXCLUDED.severity);
    IF FOUND THEN n := n + 1; END IF;
  END LOOP;
  RETURN n;
END $function$;
REVOKE EXECUTE ON FUNCTION public.detect_received_signals(date) FROM PUBLIC, anon, authenticated;