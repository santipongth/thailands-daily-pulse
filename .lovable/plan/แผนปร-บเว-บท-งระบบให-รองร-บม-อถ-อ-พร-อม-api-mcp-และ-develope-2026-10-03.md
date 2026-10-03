# แผนปรับเว็บทั้งระบบให้รองรับมือถือ พร้อม API, MCP และ Developer Document

## เป้าหมาย
- ทำให้ทุกหน้าของ Thailand Daily Signals ใช้งานได้ดีบนมือถือ แท็บเล็ต และคอมพิวเตอร์ โดยคงแนวทาง “Modern Editorial Grid” และระบบข้อมูลเดิม
- เพิ่ม Footer กลางของเว็บ พร้อม Copyright, Sitemap, API, MCP และ Developer Document
- เพิ่ม Public Read API แบบมีเวอร์ชัน พร้อม OpenAPI/Swagger
- เพิ่ม MCP Server สำหรับ AI Agents แบบ **สาธารณะ ไม่ต้องล็อกอิน และอ่านอย่างเดียว**
- ทำ Developer Document ที่มนุษย์อ่านง่าย และมีสัญญาเครื่องมือที่ AI อ่านได้ทันที

## 1. Responsive Web Design ทั้งระบบ
- ปรับ Masthead ให้มีเมนูมือถือแบบเปิด–ปิดได้ ใช้ปุ่มและองค์ประกอบมาตรฐานของระบบเดิม พร้อมสถานะคีย์บอร์ดและ screen reader
- ตรวจและปรับทุก content route ทั้ง 21 หน้า โดยเน้น:
  - ตารางกว้างเลื่อนแนวนอนได้และมีคำอธิบายคอลัมน์ที่อ่านง่าย
  - กราฟ แผนที่ ตัวเลข และ pagination ไม่ล้นจอ
  - grid/aside เปลี่ยนเป็นแนวตั้งอย่างเหมาะสมบนมือถือ
  - ขนาดพื้นที่กด การเว้นระยะ และข้อความภาษาไทยไม่ชนหรือตัดคำผิด
- แก้จุดเสี่ยงที่พบแล้วในหน้า Data, Method, Impact และคอมโพเนนต์เขื่อน/กราฟ Brief/แผนที่สถานี
- ทดสอบ viewport อย่างน้อย 390px, 768px และ 1280px รวมทั้ง navigation, ตาราง, กราฟ และหน้าเอกสารใหม่

## 2. Footer และ Sitemap
- เพิ่ม Footer กลางเพียงจุดเดียวให้แสดงในทุกหน้าปกติ ประกอบด้วย:
  - Copyright และชื่อ Thailand Daily Signals
  - ลิงก์ Sitemap, แหล่งข้อมูล, วิธีการ, API, MCP และ Developer Document
  - ข้อความกำกับว่าข้อมูลเป็นข้อมูลสาธารณะเพื่อการติดตาม ไม่ใช่คำแนะนำส่วนบุคคล
- เพิ่มหน้า Sitemap สำหรับมนุษย์ แยกหมวด “ข้อมูลวันนี้”, “คลังและหลักฐาน”, “วิธีการ”, “สำหรับนักพัฒนา”
- คง sitemap.xml สำหรับ search engines และเพิ่มหน้าใหม่ที่ควรค้นพบเข้า sitemap

## 3. Public Read API v1
สร้าง API ภายใต้ `/api/public/v1` โดยอ่านผ่านสิทธิ์สาธารณะเดิมเท่านั้น ไม่ใช้สิทธิ์ผู้ดูแล และไม่เปิดคำสั่งรัน ingest/publish:
- Briefs: รายการ, รายวัน, updates, data window และเปรียบเทียบวันก่อน
- Signals/Events: รายการ, รายละเอียด, รุ่นแก้ไข/ถอน และผลกระทบครัวเรือน
- Sources: ทะเบียนแหล่งข้อมูล สถานะล่าสุด และประวัติความสำเร็จ/ล้มเหลว
- Observations: ค่าล่าสุด/ย้อนหลัง โดยกรอง metric, source และช่วงวันที่
- Dams/Weather: ค่าที่เว็บเปิดเผยอยู่แล้ว
- Lottery: งวดล่าสุดและประวัติที่ยืนยันแล้ว
- Social/News: รายการที่ติดป้ายชัดว่าไม่ใช่ Signal หรือข้อมูลยืนยันจากหน่วยงานรัฐ
- Calendar: วันหยุด กำหนดภาษี และปฏิทินเผยแพร่
- Evidence: เฉพาะ metadata สาธารณะ เช่น source, hash, เวลา และสถานะ HTTP; ไม่คืนไฟล์ดิบหรือลิงก์ signed URL

มาตรฐานทุก endpoint:
- query validation, ช่วงวันที่และ page size ที่จำกัด, cursor/page pagination และรูปแบบ error เดียวกัน
- CORS/OPTIONS สำหรับผู้เรียกภายนอก, cache headers/ETag ตามความเหมาะสม และ rate-limit-friendly response
- schema ระบุเวลา 4 แบบ, timezone Asia/Bangkok, หน่วย, `is_demo`/`is_live`, quality และ provenance ให้ชัด
- ไม่คืนค่า queue, job locks, app settings ภายใน, secrets, private storage หรือข้อมูลที่ไม่อยู่ในหน้าเว็บสาธารณะ

## 4. OpenAPI และหน้า API
- จัดทำ OpenAPI 3.1 เป็น machine-readable JSON/YAML จากสัญญาเดียวกับ API เพื่อลดเอกสารคลาดเคลื่อน
- เพิ่มหน้า `/developers/api`:
  - ทดลองดู endpoint, parameters, response schema และตัวอย่าง curl/JavaScript/Python
  - Swagger-style explorer สำหรับคำสั่ง GET เท่านั้น
  - อธิบาย versioning, pagination, time semantics, provenance, error model และข้อจำกัดการใช้งาน
- เพิ่มลิงก์ตรงไปยัง OpenAPI document เพื่อให้ code generator และ AI Agents อ่านได้

## 5. Public MCP Server
ติดตั้งและตั้งค่า `@lovable.dev/mcp-js` ที่ `/mcp` ชื่อ:
- `name`: `thailand-daily-signals`
- `title`: `Thailand Daily Signals`

MCP tools แบบ read-only ที่เสนอ:
1. `get_today_brief`
2. `get_brief_by_date`
3. `compare_briefs`
4. `list_signals`
5. `get_signal`
6. `list_signal_events`
7. `get_household_impact`
8. `list_sources`
9. `get_source_health`
10. `get_observations`
11. `get_dam_levels`
12. `get_weather_observations`
13. `get_latest_lottery`
14. `list_social_updates`
15. `list_news_mentions`
16. `get_calendar`
17. `get_evidence_metadata`

แต่ละ tool จะมี title, description, input schema, structured JSON result และ annotations (`readOnly`, `idempotent`, `openWorld`) ที่ตรงกับพฤติกรรมจริง รวมทั้งจำกัดจำนวนผลลัพธ์และช่วงวันที่

**จะไม่เปิด tools สำหรับ** ingest, publish/rerun Brief, backfill, AI image generation, การแก้ settings, queue/jobs, private evidence files หรือการเข้าถึงแบบผู้ดูแล

## 6. Developer Document แบบ Capability-aware
เพิ่มหน้า `/developers` เป็นศูนย์กลางสำหรับมนุษย์และ AI Agents:
- ภาพรวม capability: Signals, Briefs, Events, Sources, Observations, Evidence metadata, Calendar และ Social context
- ตาราง “ต้องการทำอะไร → ใช้ REST endpoint หรือ MCP tool ใด”
- แยก Read capability, provenance, freshness, quality, pagination และข้อจำกัดอย่างชัดเจน
- Quick start สำหรับ REST, OpenAPI, MCP client และตัวอย่าง workflow
- Data dictionary: identifiers, timestamps, score/checks, corrections/withdrawals, units, Bangkok cutoff และ demo/live labels
- Security/usage policy: public read-only, ไม่มีข้อมูลผู้ใช้, ไม่มี write action และไม่เปิด private evidence
- เพิ่ม machine-readable discovery เช่น `llms.txt` ที่ชี้ไป OpenAPI, MCP และเอกสารหลัก โดยไม่ซ้ำข้อมูลจนดูแลยาก
- เพิ่มหน้า `/developers/mcp` แสดง tool catalog, input/output examples, endpoint `/mcp`, วิธีเชื่อมต่อ และขอบเขตความปลอดภัย

## 7. ความปลอดภัยและการตรวจสอบ
- ยืนยันสิทธิ์อ่านของแต่ละตารางก่อนเปิด endpoint/tool; ถ้า anon ถูกปฏิเสธ จะตัด capability นั้นออกแทนการขยายสิทธิ์หรือใช้ admin key
- MCP ที่ผู้ใช้เลือกเป็น **public unauthenticated**: ทุกคนบนอินเทอร์เน็ตสามารถเรียก tools เหล่านี้เพื่ออ่าน Signals, Briefs, Events, Sources, observations, social/news context, calendar และ evidence metadata ที่ระบุได้
- เพิ่ม dependency scan และตรวจว่าไม่มี secret/admin client ถูกนำเข้าใน public API หรือ MCP graph
- ตรวจ OpenAPI schema เทียบ response จริง, ทดสอบ MCP manifest และเรียกทุก tool อย่างน้อยหนึ่งกรณีสำเร็จ/ไม่พบข้อมูล/validation error
- ตรวจ metadata เฉพาะของหน้า Sitemap, Developers, API และ MCP ให้ครบ
- อัปเดต `AGENTS.md` ด้วยกฎสถาปัตยกรรม public API/MCP read-only เพื่อกันการเปิด write capability ในอนาคต

## ลำดับการทำงาน
1. สร้าง shared responsive shell, mobile navigation, Footer และ human sitemap
2. ทำ responsive pass ทุกหน้าที่มีอยู่
3. สร้าง service/query layer อ่านข้อมูลสาธารณะร่วมกัน
4. สร้าง REST API v1 และ OpenAPI 3.1
5. สร้าง MCP tools จาก service layer เดียวกัน
6. สร้าง Developer, API และ MCP documentation
7. ตรวจ security, schema, manifest, desktop/mobile และ runtime จริง

## สิ่งที่ไม่เปลี่ยน
- ไม่แก้กฎ detect/rank, ตารางเวลาการดึงข้อมูล, Daily Brief cutoff, สูตรผลกระทบ หรือข้อมูลในฐานข้อมูล
- ไม่เปลี่ยน cron endpoints เดิมและไม่เผยแพร่สิทธิ์เขียนให้บุคคลภายนอก
- ไม่เผยแพร่เว็บจริงในขั้นตอนพัฒนา จนกว่าจะตรวจครบและผู้ใช้สั่ง publish
