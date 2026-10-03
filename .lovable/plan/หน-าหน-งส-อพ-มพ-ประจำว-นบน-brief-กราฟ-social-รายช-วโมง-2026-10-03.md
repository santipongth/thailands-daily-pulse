# หน้าหนังสือพิมพ์ประจำวันบน Brief + กราฟ Social รายชั่วโมง

## 1. หน้าหนังสือพิมพ์ "Thailand Daily Signals" บนสุดของทุก Brief
อยู่บนสุดของหน้า Brief แต่ละวัน ใต้หัวมีรายละเอียดเดิมทั้งหมด

**ดีไซน์เฉพาะตัว** (ผสมไทยรัฐ + เดลินิวส์ แต่ไม่ลอก):
- หัวหนังสือพิมพ์ "Thailand Daily Signals" ตัวหนาแน่น พร้อมแถบวันที่ไทย ฉบับที่ และเวลาตัดข้อมูล 05:45
- พาดหัวใหญ่สุดสีแดงเข้ม ตัวอักษรไทยหนาเต็มความกว้าง = สัญญาณอันดับ 1 ของวัน (แบบไทยรัฐ)
- รูปใหญ่ประกอบข่าวเด่น + กรอบข่าวรอง 3–4 ช่อง พื้นสีตัดกัน ขอบหนา (แบบเดลินิวส์)
- กล่องตัวเลขใหญ่ "ขึ้น/ลง เท่าไหร่" อ่านเข้าใจในพริบตา + "กระทบกระเป๋าคุณวันละ ฿X"
- แถบล่าง: จราจร FM91, อากาศ/ฝน, เขื่อน, หวยงวดล่าสุด
- เอกลักษณ์ของเรา: กริดละเอียด + จุดสถานะ (เหมือน ticker) และป้าย "ข้อมูลจริงจากหน่วยงานรัฐ" ทุกช่อง
- วันที่ไม่มีอะไรเปลี่ยน: พาดหัว "วันนี้ไม่มีอะไรเปลี่ยนเกินเกณฑ์" (ตามหลัก No change → no signal)
- ตัวเลขทุกตัวมาจากข้อมูลจริงของ Brief เท่านั้น AI ไม่เขียนตัวเลข

**รูปภาพ (AI สร้างใหม่ทุกวัน):**
- หลัง Brief เผยแพร่ตอน 06:00 ระบบสร้างรูปประกอบ 1 รูปใหญ่ (ข่าวเด่น) + สูงสุด 3 รูปเล็ก (ข่าวรอง) ตามหมวดของสัญญาณ
- ทุกรูปติดป้าย "ภาพประกอบสร้างโดย AI — ไม่ใช่ภาพเหตุการณ์จริง"
- รูปไม่มีตัวหนังสือหรือตัวเลขในภาพ เพื่อไม่ให้ขัดกับข้อมูลจริง
- ถ้าสร้างรูปไม่สำเร็จหรือเครดิต AI หมด หน้าหนังสือพิมพ์ยังแสดงได้ โดยใช้กรอบสีแทนรูป และหยุดสร้างรูปอัตโนมัติจนกว่าจะเติมเครดิต
- ใช้เครดิต AI ประมาณวันละ 4 รูป
- Brief ย้อนหลังที่ยังไม่มีรูป: สร้างให้เฉพาะ Brief ล่าสุดหนึ่งครั้งตอนติดตั้ง

## 2. กราฟ Social รายชั่วโมงในหน้า "ข้อมูลทั้งหมด"
ในกล่อง "จราจรจาก FM91" เพิ่มกราฟ 24 ชั่วโมง (00–23 น. เวลาไทย):
- แท่งหลัก = จำนวนโพสต์เกี่ยวกับกรุงเทพฯ ในแต่ละชั่วโมงของวันนี้
- เส้นเทียบ = ชั่วโมงเดียวกันของเมื่อวาน
- สรุปชั่วโมงที่โพสต์มากที่สุดของวันนี้เทียบเมื่อวาน
- ถ้ายังไม่มีข้อมูลเมื่อวาน ระบุชัดว่า "ยังไม่มีข้อมูลเมื่อวานให้เทียบ"

## Technical details
- New table `brief_images` (brief_date, slot 'hero'|'s1'..'s3', family_id, storage_path, prompt, created_at; UNIQUE(brief_date, slot)); GRANT select anon/authenticated + all service_role; RLS public read. New public storage bucket `brief-images` (illustrations only, no evidence).
- `brief-images.server.ts`: after publish step in `/api/public/brief`, generate via gateway `/v1/images/generations` model `openai/gpt-image-2.5-sunburst` (non-streaming background job, server-side, LOVABLE_API_KEY), prompt built from family + direction only (no numbers/text), upload to bucket, upsert row. 402/403 → `app_settings.brief_images_paused`; 429/5xx bounded retry; job lock `brief_images_run`.
- `src/components/brief-frontpage.tsx` rendered first in `brief.$date.tsx`; data from existing brief items/signals/impact + social/dams/lottery queries; fonts Noto Serif Thai heavy for headlines (already loaded); new tokens `--paper`, `--ink`, `--headline-red`, `--accent-green` in styles.css.
- `social-daily.tsx`: hourly buckets of `posted_at` (Asia/Bangkok) for today vs yesterday, recharts ComposedChart (Bar + Line).
- Verify with Playwright on `/brief/<latest>` and `/data-all`; test one image generation live.
