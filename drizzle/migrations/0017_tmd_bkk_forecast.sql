INSERT INTO public.metrics (id, family_id, name_th, unit, kind, threshold_abs, decimals, sort, max_gap_days, vol_k) VALUES
 ('fc_tmax_bkk','weather','พยากรณ์อุณหภูมิสูงสุด กทม. (กรมอุตุฯ)','°C','delta',2,0,5,7,2),
 ('fc_tmin_bkk','weather','พยากรณ์อุณหภูมิต่ำสุด กทม. (กรมอุตุฯ)','°C','delta',2,0,6,7,2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.source_registry (source, owner, channel, licence, cadence, unit, area, stale_after_days, url, sort) VALUES
 ('กรมอุตุฯ พยากรณ์ กทม.และปริมณฑล','กรมอุตุนิยมวิทยา','RSS/XML','ข้อมูลเปิดภาครัฐ','วันละ 2 ครั้ง','°C','กรุงเทพมหานครและปริมณฑล',1,'https://www.tmd.go.th/api/xml/region-daily-forecast?regionid=7',7)
ON CONFLICT DO NOTHING;