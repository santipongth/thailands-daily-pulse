# เผยแพร่ + ตรวจ FM91 บนเว็บจริง, กราฟ Social รายวัน, ดึงเขื่อนทุกชั่วโมง, ลบตารางเก่า

## 1. เผยแพร่และตรวจ FM91 บนเว็บจริง
- เผยแพร่เว็บรุ่นล่าสุดไปที่ https://thailands-daily-pulse.lovable.app
- สั่งรอบดึง Social บนเว็บจริงหนึ่งครั้ง (`/api/public/ingest?mode=social`) แล้วดูผลการดึงล่าสุดของ FM91
- เปิดหน้า "วันนี้" และ Daily Brief วันนี้บนเว็บจริงด้วยเบราว์เซอร์ทดสอบ เลื่อนลงไปที่กล่อง "ความเคลื่อนไหวจาก Social Media" ถ่ายภาพหน้าจอ และรายงานตามที่เห็นจริง (แสดงโพสต์ / หรือเหตุผลที่ไม่แสดง)
- หมายเหตุ: Brief ของวันนี้ปิดไปแล้วตอน 06:00 โพสต์ที่เข้าหลัง 05:45 จะอยู่ในส่วน "ไม่นับใน Brief"

## 2. กราฟ Social Media รายวันในหน้า "ข้อมูลทั้งหมด"
กล่องใหม่ "จราจรจาก FM91 — รายวัน":
- กราฟแท่งรายวัน: จำนวนโพสต์ที่เกี่ยวกับกรุงเทพฯ/ปริมณฑล ต่อวัน ตั้งแต่วันแรกที่มีข้อมูล
- ตัวเลขวันนี้เทียบวันก่อนหน้า (เพิ่ม/ลด กี่โพสต์) และพื้นที่ที่ถูกพูดถึงบ่อยที่สุดของแต่ละวัน
- ระบุชัดว่า "นับจำนวนโพสต์รายงานจราจร ไม่ใช่ดัชนีจราจรทางการ" (ดัชนีทางการยังเป็น Longdo ในแถวจราจรเดิม)
- วันที่ไม่มีโพสต์หรือดึงไม่ได้ แสดงเหตุผลจากผลการดึง ไม่เว้นว่าง

## 3. ดึงเขื่อนเจ้าพระยาและป่าสักชลสิทธิ์ทุกชั่วโมง
- ตรวจว่างานเขื่อนรายชั่วโมง (นาทีที่ 20) ทำงานจริงบนเว็บที่เผยแพร่: ดูประวัติการดึง 24 ชม.ล่าสุดของ ThaiWater และกรมชลประทาน
- ถ้าพบว่าไม่ได้รันครบทุกชั่วโมง ให้แก้ตารางเวลา/การล็อกจนรันได้จริง แล้วสั่งรันทดสอบบนเว็บจริง
- กราฟรายวันในหน้า "ข้อมูลทั้งหมด": ใช้ค่าล่าสุดของแต่ละวัน และเพิ่มกราฟรายชั่วโมงของ 48 ชม.ล่าสุด เพื่อให้เห็นว่าค่าเข้ามาทุกชั่วโมงจริง
- ข้อจำกัดที่ยังเหมือนเดิม: เขื่อนเจ้าพระยามาจาก ThaiWater ซึ่งบล็อกเซิร์ฟเวอร์เรา (429) แม้ดึงทุกชั่วโมง ค่าจะเข้าเฉพาะเมื่อ ThaiWater ยอมตอบ ทุกครั้งที่ล้มจะแสดงเหตุผล ส่วนป่าสักมาจากกรมชลประทานซึ่งไม่ถูกบล็อก

## 4. ลบตารางเก่าที่ไม่ใช้
- ลบถาวร 3 ตารางของข้อมูลเปิดภาครัฐที่ยกเลิกแล้ว (รายการชุดข้อมูล, ภาพรวมรายวัน, รายการเปลี่ยนแปลง)
- ค้นโค้ดยืนยันอีกครั้งว่าไม่มีส่วนใดอ่านตารางเหล่านี้ก่อนลบ
- **ต้องให้คุณเปิดสิทธิ์ก่อน:** การลบตารางถูกตั้งค่าเป็น "ห้ามเสมอ" ในการตั้งค่า Lovable Cloud ต้องเปลี่ยน "Execute backward incompatible database migrations" เป็น "Ask each time" แล้วผมจะส่งคำสั่งลบให้กดยืนยัน

## Technical details
- Social chart: query `social_posts` (is_bkk=true) group by Bangkok date, top `area`; reasons from `source_run_history` source FM91. New component `social-daily.tsx` rendered in `data-all.tsx`.
- Dams hourly check: `source_run_history` where run_kind='dams' last 24h; cron `ingest-dams-hourly` (20 * * * *) and `job_locks` "dams_run". Hourly chart from `observations.received_at`? Observations are one row per metric/day (upsert), so hourly series comes from `source_run_history` + raw_evidence; if insufficient, add table `dam_readings` (metric_id, value, read_at) with grants + RLS public read, written in `refreshDams`.
- Drop migration: `DROP TABLE public.gov_changes, public.gov_snapshots, public.gov_datasets;` (FK order handled), update AGENTS.md / summary notes.
- Verification: Playwright against published URL for `/`, `/brief/2026-10-03`, `/data-all`.
