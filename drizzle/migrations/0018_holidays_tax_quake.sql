CREATE TABLE public.holidays (
  id bigserial PRIMARY KEY,
  holiday_date date NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  kind text NOT NULL CHECK (kind IN ('ราชการ','พิเศษ')),
  note text CHECK (note IS NULL OR char_length(note) <= 300),
  delete_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT (id, holiday_date, name, kind, note, created_at) ON public.holidays TO anon, authenticated;
GRANT ALL ON public.holidays TO service_role;
GRANT USAGE ON SEQUENCE public.holidays_id_seq TO service_role;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read holidays" ON public.holidays FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.tax_deadlines (
  id bigserial PRIMARY KEY,
  due_date date NOT NULL,
  channel text NOT NULL,
  items text[] NOT NULL DEFAULT '{}',
  source_url text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (due_date, channel)
);
GRANT SELECT ON public.tax_deadlines TO anon, authenticated;
GRANT ALL ON public.tax_deadlines TO service_role;
GRANT USAGE ON SEQUENCE public.tax_deadlines_id_seq TO service_role;
ALTER TABLE public.tax_deadlines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read tax deadlines" ON public.tax_deadlines FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.source_registry (source, owner, channel, licence, cadence, unit, area, stale_after_days, url, sort) VALUES
 ('กรมสรรพากร (ปฏิทินภาษี)','กรมสรรพากร','เว็บไซต์ทางการ','ข้อมูลสาธารณะ','วันละครั้ง','กำหนดยื่น','ทั่วประเทศ',3,'https://www.rd.go.th/62348.html',16),
 ('วันหยุด (ผู้ใช้เพิ่มเอง)','ผู้ใช้เว็บไซต์','กรอกเอง','ไม่ได้ยืนยันจากทางการ','เมื่อมีผู้เพิ่ม','วัน','ทั่วประเทศ',3650,null,17)
ON CONFLICT DO NOTHING;
UPDATE public.source_registry SET channel='RSS', url='https://earthquake.tmd.go.th/feed/rss_tmd.xml', area='ประเทศไทย (เฉพาะจุดศูนย์กลางในไทย)' WHERE source='กรมอุตุฯ แผ่นดินไหว';

INSERT INTO public.metrics (id, family_id, name_th, unit, kind, bands, decimals, sort, max_gap_days, vol_k)
VALUES ('quake_th','weather','แผ่นดินไหวแรงสุดในประเทศไทย (วันนี้)','แมกนิจูด','level','{4,5}',1,4,7,2)
ON CONFLICT (id) DO NOTHING;
-- retire the old bbox metric (included neighbouring countries)
DELETE FROM public.signals WHERE metric_id='quake_max';
DELETE FROM public.signal_versions WHERE event_id IN (SELECT event_id FROM public.signal_events WHERE metric_id='quake_max');
DELETE FROM public.signal_events WHERE metric_id='quake_max';
DELETE FROM public.observations WHERE metric_id='quake_max';
DELETE FROM public.metrics WHERE id='quake_max';