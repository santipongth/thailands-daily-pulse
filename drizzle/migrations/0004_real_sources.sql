CREATE TABLE public.source_runs (
  source text PRIMARY KEY,
  ran_at timestamptz NOT NULL DEFAULT now(),
  ok boolean NOT NULL,
  rows integer NOT NULL DEFAULT 0,
  error text
);
GRANT SELECT ON public.source_runs TO anon, authenticated;
GRANT ALL ON public.source_runs TO service_role;
ALTER TABLE public.source_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.source_runs FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.metrics (id, family_id, name_th, unit, kind, threshold_abs, threshold_pct, bands, decimals, sort) VALUES
 ('dam_total','water','น้ำในเขื่อนใหญ่ทั้งประเทศ','% ความจุ','delta',1,NULL,NULL,1,2),
 ('gold_orn','gold','ทองรูปพรรณ (ขายออก)','บาท','delta',100,NULL,NULL,0,2),
 ('tmd_warn','weather','ประกาศเตือนภัยกรมอุตุฯ (วันนี้)','ฉบับ','level',NULL,NULL,ARRAY[1,3]::numeric[],0,3),
 ('quake_max','weather','แผ่นดินไหวแรงสุดในไทย/ใกล้เคียง','แมกนิจูด','level',NULL,NULL,ARRAY[4,5]::numeric[],1,4)
ON CONFLICT (id) DO NOTHING;

UPDATE public.families SET is_live = true, source_name = 'ThaiWater (สสน.) / กรมชลประทาน', source_url = 'https://www.thaiwater.net' WHERE id = 'water';
UPDATE public.families SET source_name = 'สมาคมค้าทองคำ', source_url = 'https://www.goldtraders.or.th' WHERE id = 'gold';
UPDATE public.families SET source_name = 'กรมอุตุนิยมวิทยา (TMD API) / Open-Meteo', source_url = 'https://data.tmd.go.th' WHERE id = 'weather';
UPDATE public.families SET source_name = 'ปตท. / บางจาก', source_url = 'https://www.bangchak.co.th/th/oilprice' WHERE id = 'oil';
UPDATE public.metrics SET name_th = 'ทองคำแท่ง (ขายออก)' WHERE id = 'gold_bar';