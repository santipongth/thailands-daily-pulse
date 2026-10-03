# เพิ่มแหล่ง Social Media: FM91 Trafficpro

## สิ่งที่ผู้ใช้จะเห็น
- หน้า "วันนี้" มีส่วนใหม่ "ความเคลื่อนไหวจาก Social Media" แสดงโพสต์ล่าสุดจาก FM91 Trafficpro ที่ AI ตัดสินว่าเกี่ยวกับกรุงเทพฯ และปริมณฑล (เวลาโพสต์, ข้อความสั้น, พื้นที่, ลิงก์ไปโพสต์จริง)
- Daily Brief มีกล่อง "ความเคลื่อนไหวจาก Social Media" ใช้กติกาเวลาตัดเดิม (ได้รับ 00:00–05:45) โพสต์ที่มาหลังจากนั้นไปอยู่ส่วนอัปเดตใต้ Brief
- แถบตัววิ่งด้านบนมีรายการโพสต์ล่าสุด ติดป้าย "FM91" แยกจากตัวเลขสัญญาณ
- ติดป้ายชัดว่า "จาก Social Media — ยังไม่ยืนยันจากหน่วยงานรัฐ" และไม่สร้าง Signal / ไม่มีผลต่อการจัดอันดับ
- หน้าแหล่งข้อมูล / ติดตามข้อมูล มีแถว FM91 พร้อมเหตุผลเมื่อดึงไม่ได้

## ความเสี่ยงที่ต้องทดสอบก่อน
Facebook มักบล็อกการดึงข้อมูลแบบไม่ได้ล็อกอิน และ Firecrawl อาจปฏิเสธเว็บ Facebook ขั้นแรกจะลองดึงจริงผ่าน Firecrawl
- ถ้าได้โพสต์: ทำต่อตามแผน
- ถ้าไม่ได้: หยุดและแจ้งเหตุผลจริง พร้อมเสนอทางเลือก (เช่น ใช้ลิงก์ mbasic/m.facebook หรือเว็บ/ช่องทางอื่นของ FM91) ก่อนสร้างส่วนอื่น

## รายละเอียดทางเทคนิค
- ตารางใหม่ `social_posts` (post_id unique, source, posted_at, text, url, received_at, is_bkk, area, summary, ai_reason, evidence_id) + GRANT + RLS อ่านสาธารณะ เขียนฝั่งเซิร์ฟเวอร์เท่านั้น
- `src/lib/fm91.server.ts`: Firecrawl scrape (markdown/rawHtml) → แยกโพสต์ → เก็บไฟล์ดิบใน evidence เหมือนแหล่งอื่น → ส่งเฉพาะโพสต์ใหม่ที่ยังไม่เคยวิเคราะห์ (dedup ด้วย post_id) ให้ AI
- AI ผ่าน Lovable AI Gateway (`openai/gpt-6-astra`, Responses API) คืน JSON {is_bkk, area, summary สั้นภาษาไทย} — สรุปห้ามเพิ่มตัวเลขที่ไม่มีในโพสต์ (ตรวจแล้วปฏิเสธ); จำกัดไม่เกิน 10 โพสต์/รอบ; 402/403 หยุดงานและบันทึกสถานะ, 429 รอรอบถัดไป
- งาน `social` ในคิว `ingest_jobs` + lease กันรันซ้อน; cron ทุก 30 นาที (`/api/public/ingest?mode=social`) ผลลัพธ์บันทึกใน `source_runs`
- `source_registry` แถว "FM91 Trafficpro (Facebook)" cadence 30 นาที, trust ต่ำ
- UI: `SocialFeed` component ใช้ในหน้าแรก และ Brief (กรองตาม data window); `daily-ticker.tsx` ต่อท้ายโพสต์ล่าสุด 3 รายการ
- อัปเดต AGENTS.md: โพสต์ Social ไม่สร้าง Signal; ticker แสดงโพสต์แยกป้าย
