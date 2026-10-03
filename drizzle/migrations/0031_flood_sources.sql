INSERT INTO public.metrics (id, family_id, name_th, unit, kind, bands, decimals, sort, max_gap_days, vol_k) VALUES
 ('flood_bank_max', 'water', 'ระดับน้ำสูงสุดเทียบตลิ่ง สถานี กทม.และปริมณฑล', '% ของตลิ่ง', 'level', '{90,100,110}', 1, 10, 3, 2),
 ('flood_over_bank', 'water', 'สถานีวัดน้ำ กทม.และปริมณฑล ที่น้ำล้นตลิ่ง', 'สถานี', 'level', '{1,3,6}', 0, 11, 3, 2),
 ('bma_road_flood', 'water', 'จุดวัดน้ำท่วมถนน กทม. ที่มีน้ำท่วม', 'จุด', 'level', '{1,5,15}', 0, 12, 3, 2),
 ('ddpm_flood_warn', 'water', 'ประกาศเฝ้าระวังน้ำท่วมจาก ปภ.', 'ฉบับ', 'level', '{1,3}', 0, 13, 7, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.source_registry (source, owner, channel, licence, cadence, unit, area, stale_after_days, url, sort) VALUES
 ('ThaiWater สถานี กทม.และปริมณฑล', 'สสน.', 'API', 'ข้อมูลเปิดภาครัฐ', 'ทุกชั่วโมง', '% ของตลิ่ง / สถานี', 'กรุงเทพฯ นนทบุรี ปทุมธานี สมุทรปราการ', 1, 'https://www.thaiwater.net', 30),
 ('กทม. ระบายน้ำ (น้ำท่วมถนน)', 'สำนักการระบายน้ำ กทม.', 'เว็บไซต์ (ผ่าน Firecrawl)', 'ข้อมูลสาธารณะภาครัฐ', 'ทุก 3 ชั่วโมง', 'จุด', 'กรุงเทพมหานคร', 1, 'https://weather.bangkok.go.th/flood/', 31),
 ('ปภ. แจ้งเตือนสาธารณภัย', 'กรมป้องกันและบรรเทาสาธารณภัย', 'เว็บไซต์ (ผ่าน Firecrawl)', 'ข้อมูลสาธารณะภาครัฐ', 'วันละครั้ง', 'ฉบับ', 'ทั่วประเทศ', 1, 'https://www.disaster.go.th/contents/disaster_alert_report', 32)
ON CONFLICT (source) DO NOTHING;
INSERT INTO public.source_config (source, enabled, schedule, daily_hour, fetch_mode, max_attempts, retry_delay_min) VALUES
 ('ThaiWater สถานี กทม.และปริมณฑล', true, 'hourly', NULL, 'auto', 3, 15),
 ('กทม. ระบายน้ำ (น้ำท่วมถนน)', true, '3h', NULL, 'firecrawl', 2, 30),
 ('ปภ. แจ้งเตือนสาธารณภัย', true, 'daily', 5, 'firecrawl', 3, 20)
ON CONFLICT (source) DO NOTHING;
CREATE OR REPLACE FUNCTION public.family_evidence_source(_family text)
 RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $function$
  select case _family
    when 'weather' then 'กรมอุตุฯ%' when 'air' then 'GISTDA%' when 'oil' then 'PTT%'
    when 'fx' then 'ExchangeRate%' when 'gold' then 'สมาคมค้าทองคำ%' when 'water' then '(ThaiWater|RID|กทม.|ปภ.)%'
    when 'food' then 'CheckRaka%' when 'farm' then 'RakaKaset%' when 'traffic' then 'Longdo%'
    when 'lottery' then 'สำนักงานสลาก%'
    else null end
$function$;