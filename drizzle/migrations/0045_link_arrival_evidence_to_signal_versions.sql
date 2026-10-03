-- Keep private evidence links attached to the actual receiving day for late observations.
CREATE OR REPLACE FUNCTION public.record_signal_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record; eid text; lv record; ev bigint[]; q text; kind text;
BEGIN
  s := CASE WHEN tg_op = 'DELETE' THEN old ELSE new END;
  eid := s.metric_id || ':' || s.signal_date;
  SELECT * INTO lv FROM signal_versions WHERE event_id = eid ORDER BY version DESC LIMIT 1;
  IF tg_op = 'DELETE' THEN
    IF lv.id IS NOT NULL AND lv.change_kind <> 'withdrawn' THEN
      INSERT INTO signal_versions (event_id, version, change_kind, severity, title, prev_value, new_value, prev_date, new_date, rules, evidence_ids, quality, reason)
      VALUES (eid, lv.version + 1, 'withdrawn', lv.severity, lv.title, lv.prev_value, lv.new_value, lv.prev_date, lv.new_date, lv.rules, lv.evidence_ids, lv.quality, 'ข้อมูลรอบใหม่ไม่ผ่านเกณฑ์แล้ว — ถอนสัญญาณ');
      UPDATE signal_events SET status = 'withdrawn', current_version = lv.version + 1, updated_at = now() WHERE event_id = eid;
    END IF;
    RETURN old;
  END IF;
  IF lv.id IS NOT NULL AND lv.change_kind <> 'withdrawn' AND lv.severity IS NOT DISTINCT FROM s.severity AND lv.title IS NOT DISTINCT FROM s.title
    AND lv.prev_value IS NOT DISTINCT FROM s.prev_value AND lv.new_value IS NOT DISTINCT FROM s.new_value THEN
    UPDATE signal_versions SET rules = s.checks WHERE id = lv.id;
    RETURN new;
  END IF;
  SELECT coalesce(array_agg(id), '{}') INTO ev FROM (
    SELECT id FROM raw_evidence WHERE source SIMILAR TO family_evidence_source(s.family_id)
      AND ((fetched_at AT TIME ZONE 'Asia/Bangkok')::date = s.signal_date
        OR id = (SELECT evidence_id FROM observations WHERE metric_id = s.metric_id
          AND observed_on = coalesce(nullif(s.checks->>'data_date', '')::date, s.signal_date)))
    ORDER BY id DESC LIMIT 15
  ) x;
  q := CASE WHEN s.is_demo THEN 'demo' WHEN cardinality(ev) > 0 THEN 'verified' ELSE 'cannot_verify' END;
  kind := CASE WHEN lv.id IS NULL THEN 'new' WHEN lv.change_kind = 'withdrawn' THEN 'reinstated' ELSE 'corrected' END;
  INSERT INTO signal_events (event_id, metric_id, family_id, event_type, signal_date, is_demo)
  VALUES (eid, s.metric_id, s.family_id, coalesce(s.checks->>'rule', 'delta'), s.signal_date, s.is_demo)
  ON CONFLICT (event_id) DO NOTHING;
  INSERT INTO signal_versions (event_id, version, change_kind, severity, title, prev_value, new_value, prev_date, new_date, rules, evidence_ids, quality, reason)
  VALUES (eid, coalesce(lv.version, 0) + 1, kind, s.severity, s.title, s.prev_value, s.new_value,
    nullif(s.checks->>'compared_with', '')::date, coalesce(nullif(s.checks->>'data_date', '')::date, s.signal_date), s.checks, ev, q,
    CASE kind WHEN 'new' THEN null WHEN 'reinstated' THEN 'กลับมาผ่านเกณฑ์อีกครั้ง' ELSE format('ค่าเปลี่ยนจาก %s เป็น %s', lv.new_value, s.new_value) END);
  UPDATE signal_events SET status = CASE WHEN kind = 'corrected' THEN 'corrected' ELSE 'active' END,
    current_version = coalesce(lv.version, 0) + 1, updated_at = now() WHERE event_id = eid;
  RETURN new;
END $$;
REVOKE ALL ON FUNCTION public.record_signal_version() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_signal_version() TO service_role;