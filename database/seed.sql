-- Setup data: categories, metrics + official thresholds, source registry/settings, calendars.
-- No collected readings, users, roles, evidence or logs. Safe to re-run (ON CONFLICT DO NOTHING).
SET session_replication_role = replica;
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: families; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.families VALUES ('food', 'ของกิน/ค่าครองชีพ', '🥬', 'หมู ไก่ ไข่ ข้าว พริก มะนาว', 'รายวัน', true, 'CheckRaka', 'https://checkraka.app/price/', 7, 'medium', 1.5) ON CONFLICT DO NOTHING;
INSERT INTO public.families VALUES ('farm', 'ราคาเกษตร', '🌾', 'ราคาสุกร ข้าว ปาล์ม มันสำปะหลัง', 'รายวัน', true, 'RakaKaset (ข้อมูลจาก สศก.)', 'https://rakakaset.com/prices/', 8, 'medium', 0.9) ON CONFLICT DO NOTHING;
INSERT INTO public.families VALUES ('traffic', 'การจราจร', '🚗', 'ดัชนีรถติด กทม.', 'รายวัน', true, 'Longdo Traffic Index', 'https://traffic.longdo.com/trafficindex', 13, 'low', 1.0) ON CONFLICT DO NOTHING;
INSERT INTO public.families VALUES ('air', 'PM2.5 / อากาศหายใจ', '😷', 'PM2.5, AQI, พื้นที่เกินเกณฑ์', 'รายชั่วโมง', true, 'GISTDA PM2.5', 'https://pm25.gistda.or.th', 2, 'medium', 1.3) ON CONFLICT DO NOTHING;
INSERT INTO public.families VALUES ('oil', 'น้ำมัน/LPG', '⛽', 'แก๊สโซฮอล์ 95, E20, ดีเซล และ LPG ถัง 15 กก.', 'เมื่อมีประกาศ', true, 'ปตท. / บางจาก', 'https://www.bangchak.co.th/th/oilprice', 3, 'high', 1.5) ON CONFLICT DO NOTHING;
INSERT INTO public.families VALUES ('water', 'น้ำ/น้ำท่วม', '🌊', 'ระดับเขื่อน ฝนสะสม พื้นที่เสี่ยง', 'รายวัน', true, 'ThaiWater (สสน.) / กรมชลประทาน', 'https://www.thaiwater.net', 6, 'high', 1.2) ON CONFLICT DO NOTHING;
INSERT INTO public.families VALUES ('gold', 'ทอง', '🪙', 'ราคาทองคำแท่ง 96.5% (ประมาณจากราคาโลก)', 'หลายครั้ง/วัน', true, 'สมาคมค้าทองคำ', 'https://www.goldtraders.or.th', 5, 'high', 0.9) ON CONFLICT DO NOTHING;
INSERT INTO public.families VALUES ('weather', 'อากาศ', '🌧️', 'ฝน อุณหภูมิ พายุ เตือนภัย', 'รายวัน', true, 'กรมอุตุนิยมวิทยา (TMD API) / Open-Meteo', 'https://data.tmd.go.th', 1, 'high', 1.2) ON CONFLICT DO NOTHING;
INSERT INTO public.families VALUES ('fx', 'เงินบาท', '💱', 'USD/THB, EUR/THB, JPY/THB', 'รายวัน', true, 'ExchangeRate-API (อ้างอิง ธปท.ภายหลัง)', 'https://www.bot.or.th', 4, 'medium', 1.0) ON CONFLICT DO NOTHING;
INSERT INTO public.families VALUES ('lottery', 'หวยรัฐบาล', '🎟️', 'ผลรางวัลที่ 1', 'วันที่ 1 และ 16', true, 'สำนักงานสลากกินแบ่งรัฐบาล (GLO API)', 'https://www.glo.or.th/mission/awarding/orderby-time', 15, 'high', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO public.families VALUES ('utility', 'ค่าไฟฟ้า', '⚡', 'ค่า Ft และค่าไฟเฉลี่ยต่อหน่วยของบ้านอยู่อาศัย', 'ทุก 4 เดือน (ตามประกาศ กกพ.)', true, 'การไฟฟ้าส่วนภูมิภาค (ค่า Ft / อัตราค่าไฟฟ้า)', 'https://www.pea.co.th/our-services/tariff/ft', 9, 'high', 1.4) ON CONFLICT DO NOTHING;
INSERT INTO public.families VALUES ('rail', 'รถไฟฟ้า', '🚇', 'ประกาศเดินรถล่าช้า/หยุดให้บริการ BTS และ MRT', 'ตามเหตุการณ์', true, 'รถไฟฟ้า BTS/MRT (X)', 'https://x.com/BTS_SkyTrain', 14, 'high', 1.1) ON CONFLICT DO NOTHING;
INSERT INTO public.families VALUES ('labour', 'ค่าแรงขั้นต่ำ', '💼', 'ค่าแรงขั้นต่ำกรุงเทพฯ ตามประกาศที่ตรวจสอบวันมีผลได้', 'ตามประกาศ', true, 'กระทรวงแรงงาน', 'https://www.mol.go.th/minimum-wage', 16, 'high', 0.7) ON CONFLICT DO NOTHING;


--
-- Data for Name: holidays; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.holidays VALUES (2, '2026-01-01', 'วันขึ้นปีใหม่', 'ราชการและธนาคาร', NULL, '', '2026-10-02 18:07:23.163012+00', true, true, 'kapook', 'https://calendar.kapook.com/2569/holiday') ON CONFLICT DO NOTHING;
INSERT INTO public.holidays VALUES (3, '2026-01-02', 'วันหยุดทำการเพิ่มเป็นกรณีพิเศษ', 'ราชการและธนาคาร', NULL, '', '2026-10-02 18:07:23.163012+00', true, true, 'kapook', 'https://calendar.kapook.com/2569/holiday') ON CONFLICT DO NOTHING;
INSERT INTO public.holidays VALUES (4, '2026-03-03', 'วันมาฆบูชา', 'ราชการและธนาคาร', NULL, '', '2026-10-02 18:07:23.163012+00', true, true, 'kapook', 'https://calendar.kapook.com/2569/holiday') ON CONFLICT DO NOTHING;
INSERT INTO public.holidays VALUES (5, '2026-04-06', 'วันจักรี', 'ราชการและธนาคาร', NULL, '', '2026-10-02 18:07:23.163012+00', true, true, 'kapook', 'https://calendar.kapook.com/2569/holiday') ON CONFLICT DO NOTHING;
INSERT INTO public.holidays VALUES (6, '2026-04-13', 'วันสงกรานต์', 'ราชการและธนาคาร', NULL, '', '2026-10-02 18:07:23.163012+00', true, true, 'kapook', 'https://calendar.kapook.com/2569/holiday') ON CONFLICT DO NOTHING;
INSERT INTO public.holidays VALUES (7, '2026-04-14', 'วันสงกรานต์', 'ราชการและธนาคาร', NULL, '', '2026-10-02 18:07:23.163012+00', true, true, 'kapook', 'https://calendar.kapook.com/2569/holiday') ON CONFLICT DO NOTHING;
INSERT INTO public.holidays VALUES (8, '2026-04-15', 'วันสงกรานต์', 'ราชการและธนาคาร', NULL, '', '2026-10-02 18:07:23.163012+00', true, true, 'kapook', 'https://calendar.kapook.com/2569/holiday') ON CONFLICT DO NOTHING;
INSERT INTO public.holidays VALUES (9, '2026-05-01', 'วันแรงงานแห่งชาติ', 'ธนาคาร', NULL, '', '2026-10-02 18:07:23.163012+00', false, true, 'kapook', 'https://calendar.kapook.com/2569/holiday') ON CONFLICT DO NOTHING;
INSERT INTO public.holidays VALUES (10, '2026-05-04', 'วันฉัตรมงคล', 'ราชการและธนาคาร', NULL, '', '2026-10-02 18:07:23.163012+00', true, true, 'kapook', 'https://calendar.kapook.com/2569/holiday') ON CONFLICT DO NOTHING;
INSERT INTO public.holidays VALUES (11, '2026-05-13', 'วันพืชมงคล', 'ราชการ', NULL, '', '2026-10-02 18:07:23.163012+00', true, false, 'kapook', 'https://calendar.kapook.com/2569/holiday') ON CONFLICT DO NOTHING;
INSERT INTO public.holidays VALUES (12, '2026-05-31', 'วันวิสาขบูชา', 'ราชการและธนาคาร', NULL, '', '2026-10-02 18:07:23.163012+00', true, true, 'kapook', 'https://calendar.kapook.com/2569/holiday') ON CONFLICT DO NOTHING;
INSERT INTO public.holidays VALUES (17, '2026-07-30', 'วันเข้าพรรษา', 'ราชการ', NULL, '', '2026-10-02 18:07:23.163012+00', true, false, 'kapook', 'https://calendar.kapook.com/2569/holiday') ON CONFLICT DO NOTHING;
INSERT INTO public.holidays VALUES (15, '2026-07-28', 'วันพระบรมราชสมภพ พระบาทสมเด็จพระปรเมนทรรามาธิบดีศรีสินทรมหาวชิราลงกรณ พระวชิรเกล้าเจ้าอยู่หัว', 'ราชการและธนาคาร', NULL, '', '2026-10-02 18:07:23.163012+00', true, true, 'kapook', 'https://calendar.kapook.com/2569/holiday') ON CONFLICT DO NOTHING;
INSERT INTO public.holidays VALUES (16, '2026-07-29', 'วันอาสาฬหบูชา', 'ราชการและธนาคาร', NULL, '', '2026-10-02 18:07:23.163012+00', true, true, 'kapook', 'https://calendar.kapook.com/2569/holiday') ON CONFLICT DO NOTHING;
INSERT INTO public.holidays VALUES (18, '2026-08-12', 'วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าสิริกิติ์ พระบรมราชินีนาถ พระบรมราชชนนีพันปีหลวง', 'ราชการและธนาคาร', NULL, '', '2026-10-02 18:07:23.163012+00', true, true, 'kapook', 'https://calendar.kapook.com/2569/holiday') ON CONFLICT DO NOTHING;
INSERT INTO public.holidays VALUES (19, '2026-10-13', 'วันคล้ายวันสวรรคต พระบาทสมเด็จพระบรมชนกาธิเบศร มหาภูมิพลอดุลยเดชมหาราช บรมนาถบพิตร', 'ราชการและธนาคาร', NULL, '', '2026-10-02 18:07:23.163012+00', true, true, 'kapook', 'https://calendar.kapook.com/2569/holiday') ON CONFLICT DO NOTHING;
INSERT INTO public.holidays VALUES (20, '2026-10-16', 'วันหยุดพิเศษธนาคาร', 'ธนาคาร', NULL, '', '2026-10-02 18:07:23.163012+00', false, true, 'kapook', 'https://calendar.kapook.com/2569/holiday') ON CONFLICT DO NOTHING;
INSERT INTO public.holidays VALUES (21, '2026-10-23', 'วันปิยมหาราช', 'ราชการและธนาคาร', NULL, '', '2026-10-02 18:07:23.163012+00', true, true, 'kapook', 'https://calendar.kapook.com/2569/holiday') ON CONFLICT DO NOTHING;
INSERT INTO public.holidays VALUES (22, '2026-12-05', 'วันคล้ายวันพระบรมราชสมภพ พระบาทสมเด็จพระบรมชนกาธิเบศร มหาภูมิพลอดุลยเดชมหาราช บรมนาถบพิตร', 'ราชการและธนาคาร', NULL, '', '2026-10-02 18:07:23.163012+00', true, true, 'kapook', 'https://calendar.kapook.com/2569/holiday') ON CONFLICT DO NOTHING;
INSERT INTO public.holidays VALUES (23, '2026-12-07', 'วันหยุดชดเชย วันพ่อแห่งชาติ', 'ราชการและธนาคาร', NULL, '', '2026-10-02 18:07:23.163012+00', true, true, 'kapook', 'https://calendar.kapook.com/2569/holiday') ON CONFLICT DO NOTHING;
INSERT INTO public.holidays VALUES (24, '2026-12-10', 'วันรัฐธรรมนูญ', 'ราชการและธนาคาร', NULL, '', '2026-10-02 18:07:23.163012+00', true, true, 'kapook', 'https://calendar.kapook.com/2569/holiday') ON CONFLICT DO NOTHING;
INSERT INTO public.holidays VALUES (25, '2026-12-31', 'วันสิ้นปี', 'ราชการและธนาคาร', NULL, '', '2026-10-02 18:07:23.163012+00', true, true, 'kapook', 'https://calendar.kapook.com/2569/holiday') ON CONFLICT DO NOTHING;
INSERT INTO public.holidays VALUES (13, '2026-06-01', 'วันหยุดชดเชยวันวิสาขบูชา', 'ราชการและธนาคาร', NULL, '', '2026-10-02 18:07:23.163012+00', true, true, 'kapook', 'https://calendar.kapook.com/2569/holiday') ON CONFLICT DO NOTHING;
INSERT INTO public.holidays VALUES (14, '2026-06-03', 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี', 'ราชการและธนาคาร', NULL, '', '2026-10-02 18:07:23.163012+00', true, true, 'kapook', 'https://calendar.kapook.com/2569/holiday') ON CONFLICT DO NOTHING;


--
-- Data for Name: metrics; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.metrics VALUES ('pm25_bkk', 'air', 'PM2.5 กรุงเทพฯ', 'µg/m³', 'level', NULL, NULL, '{37.5,75}', 1, 1, NULL, 7, 2, false, 0, 7, 2) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('gsh95', 'oil', 'แก๊สโซฮอล์ 95', 'บาท/ลิตร', 'delta', 0.1, NULL, NULL, 2, 1, NULL, 7, 2, false, 0, 7, 7) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('e20', 'oil', 'แก๊สโซฮอล์ E20', 'บาท/ลิตร', 'delta', 0.1, NULL, NULL, 2, 2, NULL, 7, 2, false, 0, 7, 7) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('diesel', 'oil', 'ดีเซล B7', 'บาท/ลิตร', 'delta', 0.1, NULL, NULL, 2, 3, NULL, 7, 2, false, 0, 7, 7) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('usdthb', 'fx', 'USD/THB', 'บาท', 'delta', NULL, 0.5, NULL, 2, 1, NULL, 7, 2, false, 0, 7, 2) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('eurthb', 'fx', 'EUR/THB', 'บาท', 'delta', NULL, 0.6, NULL, 2, 2, NULL, 7, 2, false, 0, 7, 2) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('jpythb', 'fx', 'JPY/THB (100 เยน)', 'บาท', 'delta', NULL, 0.6, NULL, 2, 3, NULL, 7, 2, false, 0, 7, 2) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('tmd_warn', 'weather', 'ประกาศเตือนภัยกรมอุตุฯ (วันนี้)', 'ฉบับ', 'level', NULL, NULL, '{1,3}', 0, 3, NULL, 7, 2, false, 0, 7, 2) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('egg', 'food', 'ไข่ไก่ เบอร์ 2', 'บาท/ฟอง', 'delta', NULL, 3, NULL, 2, 2, NULL, 7, 2, true, 1, 7, 7) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('fc_tmax_bkk', 'weather', 'พยากรณ์อุณหภูมิสูงสุด กทม. (กรมอุตุฯ)', '°C', 'delta', 2, NULL, NULL, 0, 5, NULL, 7, 2, false, 0, 7, 2) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('pm25_bkk_a4t', 'air', 'PM2.5 กทม. เฉลี่ยสถานี (Air4Thai)', 'µg/m³', 'level', NULL, NULL, NULL, 1, 2, NULL, 7, 2, false, 0, 7, 2) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('lpg', 'oil', 'ก๊าซหุงต้ม ปตท. ถัง 15 กก.', 'บาท/ถัง', 'delta', 1, NULL, NULL, 0, 4, NULL, 45, 2, false, 0, 7, 45) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('elec_unit', 'utility', 'ค่าไฟเฉลี่ยบ้าน 200 หน่วย/เดือน', 'บาท/หน่วย', 'delta', NULL, 1, NULL, 4, 300, NULL, 150, 0, false, 0, 7, 45) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('elec_ft', 'utility', 'ค่า Ft', 'บาท/หน่วย', 'delta', NULL, NULL, NULL, 4, 301, NULL, 150, 0, false, 0, 7, 45) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('rail_bts', 'rail', 'BTS ประกาศล่าช้า/หยุดให้บริการ', 'ครั้ง', 'events', NULL, NULL, '{1,3}', 0, 310, NULL, 30, 0, false, 0, 7, 2) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('rail_mrt', 'rail', 'MRT ประกาศล่าช้า/หยุดให้บริการ', 'ครั้ง', 'events', NULL, NULL, '{1,3}', 0, 311, NULL, 30, 0, false, 0, 7, 2) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('dit_pork', 'food', 'หมูเนื้อแดง สะโพก (พาณิชย์)', 'บาท/กก.', 'delta', NULL, 3, NULL, 2, 200, NULL, 7, 2, true, 4, 5, 5) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('dit_chicken', 'food', 'ไก่ เนื้ออก (พาณิชย์)', 'บาท/กก.', 'delta', NULL, 5, NULL, 2, 201, 2, 7, 2, true, 4, 5, 5) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('dit_egg', 'food', 'ไข่ไก่ เบอร์ 2 (พาณิชย์)', 'บาท/ฟอง', 'delta', NULL, 3, NULL, 2, 202, NULL, 7, 2, true, 4, 5, 5) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('gold_bar', 'gold', 'ทองคำแท่ง (ขายออก)', 'บาท', 'delta', 100, NULL, NULL, 0, 1, 0.3, 7, 2, false, 0, 7, 2) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('gold_orn', 'gold', 'ทองรูปพรรณ (ขายออก)', 'บาท', 'delta', 100, NULL, NULL, 0, 2, 0.3, 7, 2, false, 0, 7, 2) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('lotto', 'lottery', 'รางวัลที่ 1', '', 'release', NULL, NULL, NULL, 0, 1, NULL, 45, 2, false, 0, 7, 2) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('palm', 'farm', 'ผลปาล์มน้ำมัน (ทะลาย)', 'บาท/กก.', 'delta', NULL, 4, NULL, 2, 3, NULL, 7, 2, false, 0, 7, 3) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('rice_farm', 'farm', 'ข้าวเปลือกหอมมะลิ 105', 'บาท/ตัน', 'delta', NULL, 3, NULL, 0, 2, NULL, 7, 2, false, 0, 7, 3) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('hog_farm', 'farm', 'สุกรมีชีวิต (100 กก.+)', 'บาท/กก.', 'delta', NULL, 3, NULL, 0, 1, NULL, 7, 2, false, 0, 7, 3) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('rubber', 'farm', 'ยางแผ่นดิบชั้น 3', 'บาท/กก.', 'delta', NULL, 3, NULL, 2, 4, NULL, 7, 2, false, 0, 7, 3) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('latex', 'farm', 'น้ำยางสด', 'บาท/กก.', 'delta', NULL, 3, NULL, 2, 5, NULL, 7, 2, false, 0, 7, 3) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('cassava', 'farm', 'หัวมันสำปะหลังสด', 'บาท/กก.', 'delta', NULL, 5, NULL, 2, 6, NULL, 7, 2, false, 0, 7, 3) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('corn', 'farm', 'ข้าวโพดเลี้ยงสัตว์', 'บาท/กก.', 'delta', NULL, 4, NULL, 2, 7, NULL, 7, 2, false, 0, 7, 3) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('traffic_idx', 'traffic', 'ดัชนีรถติด กทม. (0–10)', '', 'level', 1.5, NULL, '{4,6,8}', 1, 1, NULL, 2, 2, false, 0, 7, 2) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('dit_rice', 'food', 'ข้าวหอมมะลิ 100% (พาณิชย์)', 'บาท/15 กก.', 'delta', NULL, 4, NULL, 2, 203, 2, 7, 2, true, 4, 5, 5) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('dit_morning_glory', 'food', 'ผักบุ้งจีน (พาณิชย์)', 'บาท/กก.', 'delta', NULL, 10, NULL, 2, 204, 3, 7, 2, true, 4, 5, 5) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('dit_palm_oil', 'food', 'น้ำมันปาล์ม ขวด 1 ลิตร (พาณิชย์)', 'บาท/ขวด', 'delta', NULL, 4, NULL, 2, 205, 2, 7, 2, true, 4, 5, 5) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('dit_lime', 'food', 'มะนาว เบอร์ 1-2 (พาณิชย์)', 'บาท/ผล', 'delta', NULL, 8, NULL, 2, 206, NULL, 7, 2, true, 4, 5, 5) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('dit_chili', 'food', 'พริกขี้หนูจินดา (พาณิชย์)', 'บาท/กก.', 'delta', NULL, 8, NULL, 2, 207, NULL, 7, 2, true, 4, 5, 5) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('chili', 'food', 'พริกขี้หนู', 'บาท/กก.', 'delta', NULL, 8, NULL, 0, 3, NULL, 7, 2, true, 1, 7, 7) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('lime', 'food', 'มะนาว', 'บาท/ลูก', 'delta', NULL, 8, NULL, 2, 4, NULL, 7, 2, true, 1, 7, 7) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('fc_tmin_bkk', 'weather', 'พยากรณ์อุณหภูมิต่ำสุด กทม. (กรมอุตุฯ)', '°C', 'delta', 2, NULL, NULL, 0, 6, NULL, 7, 2, false, 0, 7, 2) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('quake_th', 'weather', 'แผ่นดินไหวแรงสุดในประเทศไทย (วันนี้)', 'แมกนิจูด', 'level', NULL, NULL, '{4,5}', 1, 4, NULL, 7, 2, false, 0, 7, 2) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('pm25_bkk_a4t_max', 'air', 'PM2.5 สถานีสูงสุดใน กทม. (Air4Thai)', 'µg/m³', 'level', NULL, NULL, NULL, 1, 3, NULL, 7, 2, false, 0, 7, 2) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('rain_bkk', 'weather', 'ฝนสะสม 24 ชม. กทม.', 'มม.', 'level', NULL, NULL, '{10,35}', 1, 1, NULL, 7, 2, false, 0, 7, 2) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('cp_dam_q', 'water', 'เขื่อนเจ้าพระยา ระบายน้ำ (ท้ายเขื่อน C.13)', 'ลบ.ม./วินาที', 'level', NULL, NULL, '{1500,2000,2500,3000}', 0, 1, NULL, 7, 2, false, 0, 7, 2) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('dam_pasak_pct', 'water', 'เขื่อนป่าสักชลสิทธิ์ ปริมาณน้ำ', '% ความจุ', 'level', NULL, NULL, '{80,100}', 1, 2, NULL, 7, 2, false, 0, 7, 2) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('dam_pasak_out', 'water', 'เขื่อนป่าสักชลสิทธิ์ ระบายน้ำ', 'ล้าน ลบ.ม./วัน', 'delta', 5, NULL, NULL, 2, 3, NULL, 7, 2, false, 0, 7, 2) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('dam_khundan_pct', 'water', 'เขื่อนขุนด่านปราการชล ปริมาณน้ำ', '% ความจุ', 'level', NULL, NULL, '{80,100}', 1, 4, NULL, 7, 2, false, 0, 7, 2) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('tmax_bkk', 'weather', 'อุณหภูมิสูงสุดเมื่อวาน กทม. (สถานีกรุงเทพมหานคร)', '°C', 'delta', 2, NULL, NULL, 1, 2, NULL, 7, 2, false, 0, 7, 2) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('flood_bank_max', 'water', 'ระดับน้ำสูงสุดเทียบตลิ่ง สถานี กทม.และปริมณฑล', '% ของตลิ่ง', 'level', NULL, NULL, '{90,100,110}', 1, 10, NULL, 3, 2, false, 0, 7, 2) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('flood_over_bank', 'water', 'สถานีวัดน้ำ กทม.และปริมณฑล ที่น้ำล้นตลิ่ง', 'สถานี', 'level', NULL, NULL, '{1,3,6}', 0, 11, NULL, 3, 2, false, 0, 7, 2) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('bma_road_flood', 'water', 'จุดวัดน้ำท่วมถนน กทม. ที่มีน้ำท่วม', 'จุด', 'level', NULL, NULL, '{1,5,15}', 0, 12, NULL, 3, 2, false, 0, 7, 2) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('ddpm_flood_warn', 'water', 'ประกาศเฝ้าระวังน้ำท่วมจาก ปภ.', 'ฉบับ', 'level', NULL, NULL, '{1,3}', 0, 13, NULL, 7, 2, false, 0, 7, 2) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('pork', 'food', 'หมูเนื้อแดง (สะโพก)', 'บาท/กก.', 'delta', NULL, 3, NULL, 0, 1, NULL, 7, 2, true, 1, 7, 7) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('chicken', 'food', 'อกไก่', 'บาท/กก.', 'delta', NULL, 5, NULL, 0, 5, 2, 3, 2, true, 1, 7, 7) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('rice_jasmine', 'food', 'ข้าวหอมมะลิ', 'บาท/กก.', 'delta', NULL, 4, NULL, 0, 6, 2, 3, 2, true, 1, 7, 7) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('morning_glory', 'food', 'ผักบุ้ง', 'บาท/กก.', 'delta', NULL, 10, NULL, 0, 7, 3, 3, 2, true, 1, 7, 7) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('palm_oil', 'food', 'น้ำมันปาล์ม', 'บาท/ลิตร', 'delta', NULL, 4, NULL, 0, 8, 2, 3, 2, true, 1, 7, 7) ON CONFLICT DO NOTHING;
INSERT INTO public.metrics VALUES ('wage_bkk', 'labour', 'ค่าแรงขั้นต่ำกรุงเทพฯ', 'บาท/วัน', 'delta', 1, NULL, NULL, 0, 1, NULL, 365, 2, false, 0, 7, 730) ON CONFLICT DO NOTHING;


--
-- Data for Name: release_calendar; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.release_calendar VALUES (2, 'oil', 'ราคาน้ำมันอาจปรับ (คาดการณ์)', '2026-10-02') ON CONFLICT DO NOTHING;
INSERT INTO public.release_calendar VALUES (5, 'lottery', 'ประกาศผลสลากกินแบ่งรัฐบาล', '2026-10-16') ON CONFLICT DO NOTHING;


--
-- Data for Name: source_config; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.source_config VALUES ('ThaiWater สถานี กทม.และปริมณฑล', true, 'hourly', NULL, 'auto', 3, 15, '2026-10-03 14:03:51.419152+00', NULL, NULL, '{}', '{}') ON CONFLICT DO NOTHING;
INSERT INTO public.source_config VALUES ('ปภ. แจ้งเตือนสาธารณภัย', true, 'daily', 5, 'firecrawl', 3, 20, '2026-10-03 14:03:51.419152+00', NULL, NULL, '{17}', '{}') ON CONFLICT DO NOTHING;
INSERT INTO public.source_config VALUES ('Air4Thai PM2.5 (กรมควบคุมมลพิษ)', true, 'hourly', NULL, 'auto', 3, 10, '2026-10-03 14:23:14.817836+00', NULL, NULL, '{}', '{}') ON CONFLICT DO NOTHING;
INSERT INTO public.source_config VALUES ('กทม. ระบายน้ำ (น้ำท่วมถนน)', true, 'hourly_range', NULL, 'firecrawl', 3, 20, '2026-10-03 14:23:14.817836+00', 16, 8, '{}', '{}') ON CONFLICT DO NOTHING;
INSERT INTO public.source_config VALUES ('GISTDA PM2.5 (กรุงเทพฯ)', true, 'hourly', NULL, 'default', 3, 15, '2026-10-03 14:23:14.817836+00', NULL, NULL, '{}', '{}') ON CONFLICT DO NOTHING;
INSERT INTO public.source_config VALUES ('ThaiWater (สสน.)', true, '3h', NULL, 'auto', 3, 30, '2026-10-03 14:23:14.817836+00', NULL, NULL, '{}', '{}') ON CONFLICT DO NOTHING;
INSERT INTO public.source_config VALUES ('ข่าวทั่วไป RSS', true, 'hourly', NULL, 'default', 2, 15, '2026-10-03 16:31:00.74197+00', NULL, NULL, '{}', '{}') ON CONFLICT DO NOTHING;
INSERT INTO public.source_config VALUES ('กรมอุตุฯ พยากรณ์ กทม.และปริมณฑล', true, 'daily', 5, 'default', 3, 20, '2026-10-03 17:43:35.220121+00', NULL, NULL, '{17}', '{}') ON CONFLICT DO NOTHING;
INSERT INTO public.source_config VALUES ('กรมอุตุฯ ตรวจอากาศ 3 ชม. (กรุงเทพฯ)', true, 'manual', NULL, 'default', 3, NULL, '2026-10-03 17:43:35.220121+00', NULL, NULL, '{2,5,8,11,14,17,20,23}', '{}') ON CONFLICT DO NOTHING;
INSERT INTO public.source_config VALUES ('กรมการค้าภายใน (ราคาขายปลีก กทม.)', true, '3h', NULL, 'direct', 3, 30, '2026-10-03 17:53:24.164722+00', NULL, NULL, '{}', '{}') ON CONFLICT DO NOTHING;
INSERT INTO public.source_config VALUES ('CheckRaka (ราคาอาหาร)', true, '3h', NULL, 'default', 3, 30, '2026-10-03 17:53:24.164722+00', NULL, NULL, '{}', '{}') ON CONFLICT DO NOTHING;
INSERT INTO public.source_config VALUES ('การไฟฟ้า (ค่า Ft / อัตราค่าไฟ)', true, 'daily', 6, 'direct', 3, 60, '2026-10-03 18:15:38.319829+00', NULL, NULL, '{18}', '{}') ON CONFLICT DO NOTHING;
INSERT INTO public.source_config VALUES ('กระทรวงแรงงาน (ค่าแรงขั้นต่ำ กทม.)', true, 'daily', 5, 'direct', 1, 60, '2026-10-03 19:22:38.609639+00', NULL, NULL, '{}', '{}') ON CONFLICT DO NOTHING;
INSERT INTO public.source_config VALUES ('FM91 Trafficpro (X)', false, 'default', NULL, 'direct', 3, NULL, '2026-10-03 20:15:13.399+00', NULL, NULL, '{}', '{}') ON CONFLICT DO NOTHING;
INSERT INTO public.source_config VALUES ('รถไฟฟ้า BTS/MRT (X)', false, 'hourly_range', NULL, 'direct', 2, 20, '2026-10-03 20:15:15.706+00', 5, 0, '{0}', '{}') ON CONFLICT DO NOTHING;
INSERT INTO public.source_config VALUES ('สนพ. (ราคา LPG ถัง 15 กก.)', true, 'daily', 5, 'direct', 3, 30, '2026-10-03 20:39:31.69864+00', NULL, NULL, '{}', '{}') ON CONFLICT DO NOTHING;


--
-- Data for Name: source_registry; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.source_registry VALUES ('ข่าว RSS', 'มติชน, ประชาชาติธุรกิจ, ข่าวสด', 'RSS', 'ใช้หัวข้อ+ลิงก์เท่านั้น', 'รายชั่วโมง', 'ข่าว', 'ทั่วประเทศ', 1, NULL, 15) ON CONFLICT DO NOTHING;
INSERT INTO public.source_registry VALUES ('FM91 Trafficpro (X)', 'สวพ.FM91', 'Social Media (X ผ่าน Firecrawl) + AI คัดกรอง', 'ไม่ระบุ', 'ทุก 30 นาที', 'โพสต์', 'กรุงเทพฯ และปริมณฑล', 1, 'https://x.com/fm91trafficpro', 18) ON CONFLICT DO NOTHING;
INSERT INTO public.source_registry VALUES ('กรมอุตุฯ ตรวจอากาศ 3 ชม. (กรุงเทพฯ)', 'กรมอุตุนิยมวิทยา', 'API (XML)', 'ข้อมูลเปิด TMD', 'ทุก 3 ชม.', '°C / มม.', 'สถานีกรุงเทพมหานคร (48455) · สำรองตามลำดับ: ท่าเรือคลองเตย 48454, บางนา สกษ. 48453, ดอนเมือง 48456, สุวรรณภูมิ 48429', 1, 'https://data.tmd.go.th/api/Weather3Hours/V2/?uid=api&ukey=api12345', 5) ON CONFLICT DO NOTHING;
INSERT INTO public.source_registry VALUES ('GISTDA PM2.5 (กรุงเทพฯ)', 'GISTDA (สทอภ.)', 'API (JSON)', 'CC BY 4.0', 'รายชั่วโมง', 'µg/m³', 'กรุงเทพมหานคร', 1, 'https://pm25.gistda.or.th/rest/getPm25byProvince', 5) ON CONFLICT DO NOTHING;
INSERT INTO public.source_registry VALUES ('กรมอุตุฯ พยากรณ์ กทม.และปริมณฑล', 'กรมอุตุนิยมวิทยา', 'API (XML) 7 วัน', 'ข้อมูลเปิดภาครัฐ', 'รายวัน', '°C', 'กรุงเทพมหานครและปริมณฑล', 1, 'https://data.tmd.go.th/api/WeatherForecast7Days/V2/?uid=api&ukey=api12345', 7) ON CONFLICT DO NOTHING;
INSERT INTO public.source_registry VALUES ('สมาคมค้าทองคำ', 'สมาคมค้าทองคำ', 'API', 'ข้อมูลสาธารณะ', 'รายวัน ทุกวัน 05:00', 'บาท/บาททองคำ', 'ทั่วประเทศ', 1, 'https://www.goldtraders.or.th', 3) ON CONFLICT DO NOTHING;
INSERT INTO public.source_registry VALUES ('ExchangeRate (อัตราแลกเปลี่ยน)', 'open.er-api.com', 'API', 'ฟรี มีเงื่อนไขอ้างอิงแหล่ง', 'รายวัน ทุกวัน 05:00', 'บาท', 'ทั่วโลก', 1, 'https://open.er-api.com', 4) ON CONFLICT DO NOTHING;
INSERT INTO public.source_registry VALUES ('RakaKaset (ราคาเกษตร)', 'RakaKaset (ข้อมูลจาก สศก.)', 'หน้าเว็บ (ตาราง)', 'ไม่ระบุ — อ้างอิงแหล่ง', 'รายวัน ทุกวัน 05:00', 'บาท/กก. / บาท/ตัน', 'ทั่วประเทศ', 1, 'https://rakakaset.com/prices/', 10) ON CONFLICT DO NOTHING;
INSERT INTO public.source_registry VALUES ('PTT (thai-oil-api)', 'ปตท.', 'API', 'ข้อมูลสาธารณะ (ประกาศราคา)', 'เมื่อมีประกาศ / ตรวจรายชั่วโมง', 'บาท/ลิตร', 'ทั่วประเทศ', 1, 'https://www.pttor.com', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.source_registry VALUES ('บางจาก (Bangchak API)', 'บางจาก', 'API', 'ข้อมูลสาธารณะ (ประกาศราคา)', 'เมื่อมีประกาศ / ตรวจรายชั่วโมง', 'บาท/ลิตร', 'ทั่วประเทศ', 1, 'https://www.bangchak.co.th', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.source_registry VALUES ('CheckRaka (ราคาอาหาร)', 'CheckRaka (รวบรวมจากหลายแหล่ง)', 'หน้าเว็บ (JSON-LD)', 'ไม่ระบุ — อ้างอิงแหล่ง', 'รายวัน 05:00', 'บาท/หน่วย', 'ทั่วประเทศ (เฉลี่ย)', 1, 'https://checkraka.app/price/', 9) ON CONFLICT DO NOTHING;
INSERT INTO public.source_registry VALUES ('สำนักงานสลากกินแบ่งรัฐบาล (GLO)', 'สำนักงานสลากกินแบ่งรัฐบาล', 'API', 'ข้อมูลสาธารณะ', 'งวดละ 2 ครั้ง/เดือน', 'เลขรางวัล', 'ทั่วประเทศ', 1, 'https://www.glo.or.th', 12) ON CONFLICT DO NOTHING;
INSERT INTO public.source_registry VALUES ('Longdo Traffic Index', 'Longdo Traffic (Metamedia)', 'API', 'ฟรี มีเงื่อนไขอ้างอิงแหล่ง', 'รายชั่วโมง', 'ดัชนี 0–10', 'กรุงเทพฯ', 1, 'https://traffic.longdo.com', 11) ON CONFLICT DO NOTHING;
INSERT INTO public.source_registry VALUES ('กรมสรรพากร (ปฏิทินภาษี)', 'กรมสรรพากร', 'เว็บไซต์ทางการ', 'ข้อมูลสาธารณะ', 'วันละครั้ง', 'กำหนดยื่น', 'ทั่วประเทศ', 1, 'https://www.rd.go.th/62348.html', 16) ON CONFLICT DO NOTHING;
INSERT INTO public.source_registry VALUES ('กรมอุตุฯ แผ่นดินไหว', 'กรมอุตุนิยมวิทยา', 'RSS', 'ข้อมูลเปิดภาครัฐ', 'เมื่อเกิดเหตุ', 'ริกเตอร์', 'ประเทศไทย (เฉพาะจุดศูนย์กลางในไทย)', 1, 'https://earthquake.tmd.go.th/feed/rss_tmd.xml', 7) ON CONFLICT DO NOTHING;
INSERT INTO public.source_registry VALUES ('Kapook ปฏิทินวันหยุด', 'Kapook (อ้างอิงประกาศ ครม./ธปท.)', 'หน้าเว็บ (HTML)', 'ไม่ได้ยืนยันจากทางการ', 'วันละครั้ง', 'วัน', 'ทั่วประเทศ', 1, 'https://calendar.kapook.com/2569/holiday', 17) ON CONFLICT DO NOTHING;
INSERT INTO public.source_registry VALUES ('ThaiWater (สสน.)', 'สสน.', 'API', 'ข้อมูลเปิดภาครัฐ', 'รายชั่วโมง', 'ลบ.ม./วินาที', 'เขื่อนหลัก', 1, 'https://www.thaiwater.net', 8) ON CONFLICT DO NOTHING;
INSERT INTO public.source_registry VALUES ('RID อ่างเก็บน้ำ (กรมชลประทาน)', 'กรมชลประทาน', 'JSON API', 'ข้อมูลสาธารณะ', 'รายวัน', '% ความจุ / ล้าน ลบ.ม.', 'ป่าสักชลสิทธิ์ · ขุนด่านปราการชล', 1, 'https://app.rid.go.th/reservoir/api/dam/public', 9) ON CONFLICT DO NOTHING;
INSERT INTO public.source_registry VALUES ('กรมอุตุฯ เตือนภัย', 'กรมอุตุนิยมวิทยา', 'API', 'ข้อมูลเปิดภาครัฐ', 'เมื่อมีประกาศ', 'ฉบับ', 'ทั่วประเทศ', 1, 'https://data.tmd.go.th', 6) ON CONFLICT DO NOTHING;
INSERT INTO public.source_registry VALUES ('ThaiWater สถานี กทม.และปริมณฑล', 'สสน.', 'API', 'ข้อมูลเปิดภาครัฐ', 'ทุกชั่วโมง', '% ของตลิ่ง / สถานี', 'กรุงเทพฯ นนทบุรี ปทุมธานี สมุทรปราการ', 1, 'https://www.thaiwater.net', 30) ON CONFLICT DO NOTHING;
INSERT INTO public.source_registry VALUES ('กทม. ระบายน้ำ (น้ำท่วมถนน)', 'สำนักการระบายน้ำ กทม.', 'เว็บไซต์ (ผ่าน Firecrawl)', 'ข้อมูลสาธารณะภาครัฐ', 'ทุก 3 ชั่วโมง', 'จุด', 'กรุงเทพมหานคร', 1, 'https://weather.bangkok.go.th/flood/', 31) ON CONFLICT DO NOTHING;
INSERT INTO public.source_registry VALUES ('ปภ. แจ้งเตือนสาธารณภัย', 'กรมป้องกันและบรรเทาสาธารณภัย', 'เว็บไซต์ (ผ่าน Firecrawl)', 'ข้อมูลสาธารณะภาครัฐ', 'วันละครั้ง', 'ฉบับ', 'ทั่วประเทศ', 1, 'https://www.disaster.go.th/contents/disaster_alert_report', 32) ON CONFLICT DO NOTHING;
INSERT INTO public.source_registry VALUES ('Air4Thai PM2.5 (กรมควบคุมมลพิษ)', 'กรมควบคุมมลพิษ', 'API (JSON)', 'ข้อมูลเปิดภาครัฐ', 'รายชั่วโมง', 'µg/m³', 'สถานีตรวจวัดใน กทม. (~59 สถานี)', 1, 'https://air4thai.pcd.go.th/', 61) ON CONFLICT DO NOTHING;
INSERT INTO public.source_registry VALUES ('รถไฟฟ้า BTS/MRT (X)', 'BTS SkyTrain / BEM (MRT)', 'X (ผ่าน Firecrawl)', 'โพสต์สาธารณะ', 'ตามเหตุการณ์', 'ประกาศ', 'รถไฟฟ้า กทม.', 1, 'https://x.com/BTS_SkyTrain', 62) ON CONFLICT DO NOTHING;
INSERT INTO public.source_registry VALUES ('กรมการค้าภายใน (ราคาขายปลีก กทม.)', 'กรมการค้าภายใน กระทรวงพาณิชย์', 'หน้าเว็บรายงานราคา (pricelist.dit.go.th)', 'ข้อมูลราชการ เปิดเผย', 'วันทำการ (จ.–ศ.)', 'บาท/หน่วย', 'กรุงเทพมหานคร', 4, 'https://pricelist.dit.go.th/main_price.php?seltime=day', 90) ON CONFLICT DO NOTHING;
INSERT INTO public.source_registry VALUES ('การไฟฟ้า (ค่า Ft / อัตราค่าไฟ)', 'การไฟฟ้าส่วนภูมิภาค (ค่า Ft ประกาศโดย กกพ. ใช้เท่ากันทั้ง กฟน./กฟภ.)', 'หน้าเว็บ + เอกสารอัตราค่าไฟฟ้า', 'ข้อมูลราชการ เปิดเผย', 'ทุก 4 เดือน', 'บาท/หน่วย', 'ทั้งประเทศ (รวมกรุงเทพฯ)', 7, 'https://www.pea.co.th/our-services/tariff/ft', 91) ON CONFLICT DO NOTHING;
INSERT INTO public.source_registry VALUES ('สนพ. (ราคา LPG ถัง 15 กก.)', 'สำนักงานนโยบายและแผนพลังงาน', 'API', 'ข้อมูลสาธารณะภาครัฐ', 'วันละครั้ง', 'บาท/ถัง 15 กก.', 'ประเทศไทย', 45, 'https://www.eppo.go.th/wp-json/oil-api/v1/lpg-prices', 45) ON CONFLICT DO NOTHING;
INSERT INTO public.source_registry VALUES ('กระทรวงแรงงาน (ค่าแรงขั้นต่ำ กทม.)', 'กระทรวงแรงงาน', 'เว็บไซต์ทางการ', 'ข้อมูลสาธารณะภาครัฐ', 'วันละครั้ง', 'บาท/วัน', 'กรุงเทพมหานคร', 365, 'https://www.mol.go.th/minimum-wage', 46) ON CONFLICT DO NOTHING;
INSERT INTO public.source_registry VALUES ('ข่าวทั่วไป RSS', 'Thai PBS, ข่าวสด, ประชาไท', 'rss', 'อ่านหัวข้อข่าวพร้อมลิงก์ต้นทาง', 'รายชั่วโมง', 'หัวข้อข่าว', 'ประเทศไทย', 1, 'https://news.thaipbs.or.th/rss/news', 99) ON CONFLICT DO NOTHING;


--
-- Data for Name: tax_deadlines; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tax_deadlines VALUES (1, '2026-10-07', 'กำหนดยื่นแบบ', '{"ยื่นรายการภาษีเงินได้หัก ณ ที่จ่าย (ภ.ง.ด. 1, ภ.ง.ด. 2, ภ.ง.ด. 3, ภ.ง.ด. 53, ภ.ง.ด. 54)","นำส่งภาษีมูลค่าเพิ่ม (ภ.พ. 36)"}', 'https://www.rd.go.th/62348.html', '2026-10-03 20:00:15.25+00') ON CONFLICT DO NOTHING;
INSERT INTO public.tax_deadlines VALUES (2, '2026-10-08', 'กำหนดยื่นแบบทางอินเทอร์เน็ต', '{"ยื่นแบบแสดงรายการภาษีเงินได้บุคคลธรรมดาครึ่งปี (ภ.ง.ด. 94)"}', 'https://www.rd.go.th/62348.html', '2026-10-03 20:00:15.25+00') ON CONFLICT DO NOTHING;
INSERT INTO public.tax_deadlines VALUES (3, '2026-10-15', 'กำหนดยื่นแบบทางอินเทอร์เน็ต', '{"ยื่นรายการภาษีเงินได้หัก ณ ที่จ่าย (ภ.ง.ด. 1, ภ.ง.ด. 2, ภ.ง.ด. 3, ภ.ง.ด. 53, ภ.ง.ด. 54)","นำส่งภาษีมูลค่าเพิ่ม (ภ.พ. 36)"}', 'https://www.rd.go.th/62348.html', '2026-10-03 20:00:15.25+00') ON CONFLICT DO NOTHING;
INSERT INTO public.tax_deadlines VALUES (4, '2026-10-15', 'กำหนดยื่นแบบ', '{"ยื่นแบบภาษีมูลค่าเพิ่ม ภ.พ. 30","ยื่นแบบภาษีธุรกิจเฉพาะ ภ.ธ. 40"}', 'https://www.rd.go.th/62348.html', '2026-10-03 20:00:15.25+00') ON CONFLICT DO NOTHING;
INSERT INTO public.tax_deadlines VALUES (5, '2026-10-26', 'กำหนดยื่นแบบทางอินเทอร์เน็ต', '{"ยื่นแบบภาษีมูลค่าเพิ่ม ภ.พ. 30","ยื่นแบบภาษีธุรกิจเฉพาะ ภ.ธ. 40"}', 'https://www.rd.go.th/62348.html', '2026-10-03 20:00:15.25+00') ON CONFLICT DO NOTHING;


--
-- Name: holidays_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--



--
-- Name: release_calendar_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--



--
-- Name: tax_deadlines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--



--
-- PostgreSQL database dump complete
--


INSERT INTO public.app_settings (key, value, updated_at) SELECT key, value, now() FROM (VALUES
('holiday_url', 'https://calendar.kapook.com/2569/holiday')
) v(key, value) ON CONFLICT (key) DO NOTHING;
SET session_replication_role = DEFAULT;
