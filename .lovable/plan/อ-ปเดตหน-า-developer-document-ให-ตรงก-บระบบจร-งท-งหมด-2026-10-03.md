# อัปเดตหน้า Developer Document ให้ตรงกับระบบจริงทั้งหมด

## ผลทดสอบก่อนแก้ (เรียกจริงแล้ว)
- Public API v1 ทั้ง 16 endpoint ตอบ 200 พร้อมข้อมูลจริง, `date=bad` ตอบ 400, resource ที่ไม่มีตอบ 404
- `/api/public/health` และ `/api/public/openapi.json` ตอบ 200
- MCP `/mcp` ตอบ tools/list ครบ 17 tool ตรงกับหน้าเอกสาร

## สิ่งที่เอกสารยังขาดหรือไม่ตรง
- บอกว่า `date` / `id` ใช้ได้ทุก endpoint แต่จริง ๆ แต่ละ endpoint รองรับต่างกัน (เช่น lottery, holidays ไม่รองรับ id/date; `id` ของ signals คือ event_id, ของ weather คือ station_id)
- ไม่บอกเรื่องจำกัด 120 คำขอ/นาที/IP (429 + Retry-After), CORS, cache 60 วินาที ตอบไม่ครบ
- ไม่มีรายการ field ของแต่ละ resource และตัวอย่าง response จริง; OpenAPI เป็น schema ว่าง
- ไม่มีเอกสาร health (status ok/degraded, คิวงาน, ความสดแต่ละแหล่ง, 503), ภาพแชร์ Brief `/api/public/og/brief/{date}`, `llms.txt`
- ไม่อธิบายความหมายระดับสัญญาณ (สำคัญมาก/น่าจับตา/เล็กน้อย), การมาช้า (late arrival), Brief cutoff 05:45 / เผยแพร่ 05:55, การถอนเหตุการณ์
- หน้า MCP มีแค่ชื่อ tool ไม่มีคำอธิบาย/argument ของแต่ละ tool

## สิ่งที่จะทำ
1. **หน้า /developers (ภาพรวม)** — ตารางความสามารถครบทุก resource, quick start, ข้อจำกัด (rate limit, สูงสุด 100 รายการ, read-only), คำอธิบายเวลา/คุณภาพข้อมูล, วงจร Brief, ระดับสัญญาณ, การมาช้า/แก้ไข/ถอน, changelog สั้น ๆ พร้อมวันที่อัปเดตเอกสาร
2. **หน้า /developers/api** — ตาราง endpoint ทีละตัว: ตารางต้นทาง, ลำดับเรียง, `date` กรอง field ไหน, `id` กรอง field ไหน, หมายเหตุ (บริบทเท่านั้น), field หลัก, ปุ่ม "ลองเรียก" + ตัวอย่าง response จริง; ส่วน error codes ครบ (400/403/404/429/500), headers (CORS, cache), health endpoint และ OG image, ตัวอย่าง curl/JS/Python ที่ใช้ได้จริง
3. **หน้า /developers/mcp** — รายการ tool พร้อมคำอธิบายและ argument ดึงจากคำนิยาม tool จริง (ไม่พิมพ์ซ้ำด้วยมือ), ตัวอย่าง initialize / tools/list / tools/call, ตัวอย่างตั้งค่าใน client AI
4. **OpenAPI** — แต่ละ path ประกาศเฉพาะ parameter ที่รองรับจริง, schema field ของแต่ละ resource, response 429, เพิ่ม `/health`; สร้างจากตัวกำหนด resource ชุดเดียวกับ API เพื่อไม่ให้หลุดกันอีก
5. **llms.txt** — เพิ่มลิงก์ health, รายการ resource, rate limit
6. **ทดสอบ** — เรียกทุก endpoint + ทุก parameter ที่เอกสารบอกว่ารองรับ, ทุก MCP tool ด้วย tools/call, ตรวจ OpenAPI ว่าเป็น JSON ถูกต้องและ path ตรงกับ API, เปิดทั้ง 3 หน้าบนคอม/มือถือด้วย Playwright ดูว่าปุ่มลองเรียกใช้ได้และไม่มี error

## Technical details
- ย้าย map resource จาก `api/public/v1/$.ts` ไปไว้ใน `src/lib/openapi.ts` (browser-safe) เป็น `API_SPEC` เดียว: path, table, order, date, id, note, fields, description — ใช้ร่วมทั้ง handler, OpenAPI, และหน้าเอกสาร
- field list อิงคอลัมน์ที่เปิดจริงใน `SAFE_COLUMNS` / ตาราง; หน้า MCP import รายการ tool metadata (name/title/description/input) แยกเป็นโมดูลที่ไม่ดึงโค้ดฝั่ง server
- ไม่เปลี่ยนพฤติกรรม API, ไม่เพิ่มการเขียนหรือข้อมูลส่วนตัว; ไม่เพิ่ม resource ใหม่ (เช่นข้อมูลสถานีรายจุด) — ถ้าต้องการค่อยทำแยก
- อัปเดต AGENTS.md: เอกสาร/OpenAPI สร้างจาก `API_SPEC` เดียว
