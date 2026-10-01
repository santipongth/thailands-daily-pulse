ALTER TABLE public.source_runs ADD COLUMN IF NOT EXISTS last_ok_at timestamptz, ADD COLUMN IF NOT EXISTS url text, ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'api', ADD COLUMN IF NOT EXISTS sample text;
INSERT INTO public.families (id, name_th, emoji, description, cadence, is_live, source_name, source_url, sort) VALUES
 ('gov','ประกาศหน่วยงานรัฐ','🏛️','ประกาศใหม่ที่ปรากฏบนเว็บไซต์ทางการของหน่วยงานรัฐ ตรวจทุกวัน','รายวัน',true,'เว็บไซต์ทางการของหน่วยงาน (crawler)',NULL,99)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.metrics (id, family_id, name_th, unit, kind, threshold_abs, threshold_pct, bands, decimals, sort) VALUES
 ('gov_ddc','gov','ประกาศใหม่ กรมควบคุมโรค','ฉบับ','level',NULL,NULL,ARRAY[1,3]::numeric[],0,1),
 ('gov_dol','gov','ประกาศใหม่ กรมที่ดิน','ฉบับ','level',NULL,NULL,ARRAY[1,3]::numeric[],0,2),
 ('gov_fish','gov','ประกาศใหม่ กรมประมง','ฉบับ','level',NULL,NULL,ARRAY[1,3]::numeric[],0,3),
 ('gov_dlt','gov','ประกาศใหม่ กรมการขนส่งทางบก','ฉบับ','level',NULL,NULL,ARRAY[1,3]::numeric[],0,4),
 ('gov_dld','gov','ประกาศใหม่ กรมปศุสัตว์','ฉบับ','level',NULL,NULL,ARRAY[1,3]::numeric[],0,5)
ON CONFLICT (id) DO NOTHING;