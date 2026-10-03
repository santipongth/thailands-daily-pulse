-- Adjust late-arrival windows for oil and labour families to prevent discarding valid delayed data.
CREATE OR REPLACE FUNCTION public.detect_received_signals(_d date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; c record; n integer := 0; max_lag integer; prior_received timestamptz;
BEGIN
  FOR r IN
    SELECT DISTINCT ON (o.metric_id) o.metric_id, o.observed_on, o.received_at, m.family_id,
      CASE WHEN m.weekly THEN greatest(m.lag_days, 1)
           WHEN m.family_id = 'farm' THEN 3
           WHEN m.family_id = 'oil' THEN 3
           WHEN m.family_id = 'labour' THEN 30
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
    max_lag := r.allowed_days;
    IF _d - r.observed_on > max_lag THEN CONTINUE; END IF;
    
    IF EXISTS (SELECT 1 FROM public.observations x WHERE x.metric_id = r.metric_id AND x.observed_on = _d AND x.is_demo = false) THEN CONTINUE; END IF;
    
    SELECT * INTO c FROM public.detect_core(r.observed_on, NULL)
      WHERE metric_id = r.metric_id AND severity IS NOT NULL AND is_demo = false;
    IF NOT FOUND THEN CONTINUE; END IF;

    INSERT INTO public.signals (family_id, metric_id, signal_date, severity, title, prev_value, new_value, change_abs, change_pct, is_demo, checks)
    VALUES (c.family_id, c.metric_id, _d, c.severity, c.title, c.prev_value, c.new_value, c.change_abs, c.change_pct, false,
      c.checks || jsonb_build_object('data_date', r.observed_on, 'received_at', r.received_at,
         'arrival_day', _d, 'arrival_lag_days', _d - r.observed_on, 'arrival_rule', 'late_above_threshold'))
    ON CONFLICT (metric_id, signal_date) DO NOTHING;
    IF FOUND THEN n := n + 1; END IF;
  END LOOP;
  RETURN n;
END $$;

-- Update metric metadata to match allowed lag expectations
UPDATE public.metrics SET lag_days = 3 WHERE family_id = 'oil' AND lag_days < 3;
UPDATE public.metrics SET lag_days = 30 WHERE family_id = 'labour' AND lag_days < 30;
