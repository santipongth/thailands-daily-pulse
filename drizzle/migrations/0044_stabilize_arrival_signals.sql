-- Redetection must not withdraw an arrival-day signal merely because the source's observation date was earlier.
CREATE OR REPLACE FUNCTION public.detect_signals(_d date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; n integer := 0;
BEGIN
  FOR c IN SELECT * FROM public.detect_core(_d, NULL) LOOP
    IF c.severity IS NULL THEN
      DELETE FROM public.signals WHERE metric_id = c.metric_id AND signal_date = _d
        AND coalesce(checks->>'arrival_rule', '') <> 'late_above_threshold';
    ELSE
      INSERT INTO public.signals (family_id, metric_id, signal_date, severity, title, prev_value, new_value, change_abs, change_pct, is_demo, checks)
      VALUES (c.family_id, c.metric_id, _d, c.severity, c.title, c.prev_value, c.new_value, c.change_abs, c.change_pct, c.is_demo, c.checks)
      ON CONFLICT (metric_id, signal_date) DO UPDATE SET severity = EXCLUDED.severity, title = EXCLUDED.title,
        prev_value = EXCLUDED.prev_value, new_value = EXCLUDED.new_value, change_abs = EXCLUDED.change_abs,
        change_pct = EXCLUDED.change_pct, is_demo = EXCLUDED.is_demo, checks = EXCLUDED.checks
      WHERE coalesce(signals.checks->>'arrival_rule', '') <> 'late_above_threshold'
         OR (CASE EXCLUDED.severity WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END) >
            (CASE signals.severity WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END);
      n := n + 1;
    END IF;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.detect_signals(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.detect_signals(date) TO service_role;

CREATE OR REPLACE FUNCTION public.detect_received_signals(_d date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; c record; n integer := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT ON (o.metric_id) o.metric_id, o.observed_on, o.received_at,
      CASE WHEN m.weekly THEN greatest(m.lag_days, 1)
           WHEN m.family_id = 'farm' THEN 3
           WHEN m.family_id = 'utility' THEN 45
           ELSE 2 END AS allowed_days
    FROM public.observations o JOIN public.metrics m ON m.id = o.metric_id
    WHERE o.is_demo = false
      AND o.received_at >= (_d::timestamp at time zone 'Asia/Bangkok')
      AND o.received_at < ((_d + 1)::timestamp at time zone 'Asia/Bangkok')
      AND o.observed_on < _d
      AND (m.threshold_abs IS NOT NULL OR m.threshold_pct IS NOT NULL OR m.bands IS NOT NULL OR m.kind = 'release')
    ORDER BY o.metric_id, o.observed_on DESC
  LOOP
    IF _d - r.observed_on > r.allowed_days THEN CONTINUE; END IF;
    SELECT * INTO c FROM public.detect_core(r.observed_on, NULL)
      WHERE metric_id = r.metric_id AND severity IS NOT NULL AND is_demo = false;
    IF NOT FOUND THEN CONTINUE; END IF;
    INSERT INTO public.signals (family_id, metric_id, signal_date, severity, title, prev_value, new_value, change_abs, change_pct, is_demo, checks)
    VALUES (c.family_id, c.metric_id, _d, c.severity, c.title, c.prev_value, c.new_value, c.change_abs, c.change_pct, false,
      c.checks || jsonb_build_object('data_date', r.observed_on, 'received_at', r.received_at,
         'arrival_day', _d, 'arrival_lag_days', _d - r.observed_on, 'arrival_rule', 'late_above_threshold'))
    ON CONFLICT (metric_id, signal_date) DO UPDATE SET
      severity = EXCLUDED.severity, title = EXCLUDED.title, prev_value = EXCLUDED.prev_value,
      new_value = EXCLUDED.new_value, change_abs = EXCLUDED.change_abs, change_pct = EXCLUDED.change_pct,
      is_demo = false, checks = EXCLUDED.checks
    WHERE (CASE EXCLUDED.severity WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END) >
      (CASE signals.severity WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END);
    IF FOUND THEN n := n + 1; END IF;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.detect_received_signals(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.detect_received_signals(date) TO service_role;