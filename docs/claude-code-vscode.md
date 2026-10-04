# Developing with Claude Code + VS Code

คู่มือนี้อธิบายวิธีนำ source code ของโปรเจกต์นี้ไปพัฒนาต่อด้วย **Claude Code** (AI coding assistant ของ Anthropic) ร่วมกับ **VS Code** ตั้งแต่ติดตั้งจนถึงส่งงาน — ทั้งภาษาไทยและ English

---

## ภาษาไทย

### 1. สิ่งที่ต้องมีก่อนเริ่ม

| เครื่องมือ | ติดตั้ง |
|---|---|
| Git | https://git-scm.com |
| Bun (runtime หลักของโปรเจกต์) | `curl -fsSL https://bun.sh/install \| bash` |
| VS Code | https://code.visualstudio.com |
| Node.js 20+ (บางเครื่องมือต้องใช้) | https://nodejs.org |
| บัญชี Anthropic (สำหรับ Claude Code) | https://claude.ai |

### 2. โคลนโปรเจกต์และติดตั้ง

```bash
git clone https://github.com/<your-account>/thailands-daily-pulse.git
cd thailands-daily-pulse

# ติดตั้ง dependencies + ตั้งค่า .env + สร้างฐานข้อมูล ในคำสั่งเดียว
bun install
bun run setup      # ถามค่าทีละขั้น: Supabase URL/keys, admin email
bun run doctor     # ตรวจว่าตั้งค่าครบ บอกว่าขาดอะไร
bun run dev        # เปิด http://localhost:8080
```

ถ้าใช้ Docker แทน ดู [docs/docker.md](docker.md) — คำสั่งเดียวจบ ไม่ต้องตั้งค่าเอง

### 3. ติดตั้ง Claude Code

```bash
# ติดตั้ง Claude Code CLI
npm install -g @anthropic-ai/claude-code

# เปิดในโฟลเดอร์โปรเจกต์แล้วล็อกอิน
cd thailands-daily-pulse
claude
```

ครั้งแรกจะให้ล็อกอินด้วยบัญชี Anthropic — ทำตามลิงก์ที่ขึ้นใน terminal

### 4. ใช้ Claude Code ร่วมกับ VS Code

มี 2 วิธี ใช้ร่วมกันได้:

**วิธีที่ 1 — Claude Code ใน terminal ของ VS Code (แนะนำ)**
1. เปิดโฟลเดอร์โปรเจกต์ใน VS Code (`code .`)
2. เปิด terminal ใน VS Code (Ctrl+` หรือเมนู Terminal → New Terminal)
3. พิมพ์ `claude` — ตอนนี้คุณแชทกับ Claude ได้ใน terminal ขณะที่เห็นโค้ดและ diff ใน editor ด้านบน
4. เมื่อ Claude แก้ไฟล์ VS Code จะแสดงไฟล์ที่เปลี่ยนในแท็บ Source Control ให้ตรวจก่อน commit

**วิธีที่ 2 — ส่วนขยาย Claude Code สำหรับ VS Code**
1. เปิด Extensions (Ctrl+Shift+X) ค้นหา "Claude Code" แล้วติดตั้ง
2. กด Cmd/Ctrl+Esc เพื่อเปิดแผง Claude ข้าง editor
3. แผงนี้เห็นไฟล์ที่เปิดอยู่และ selection ของคุณโดยอัตโนมัติ — เลือกโค้ดแล้วถามได้ทันที

### 5. โปรเจกต์นี้เตรียมไว้ให้ Claude Code แล้ว

โปรเจกต์มีไฟล์ที่ Claude Code อ่านอัตโนมัติ ไม่ต้องอธิบายซ้ำ:

- **`CLAUDE.md`** (root) — กฎของโปรเจกต์: คำสั่งที่ใช้, โครงสร้างโฟลเดอร์, สิ่งที่ห้ามทำ (เช่น ห้ามเปลี่ยน threshold เอง, ห้ามแตะไฟล์ generated)
- **`AGENTS.md`** — กฎสถาปัตยกรรมละเอียด (Claude Code อ่านผ่าน import ใน CLAUDE.md)
- **`src/lib/AGENTS.md`** — กฎเฉพาะ data sources
- **`.claude/commands/`** — slash commands พร้อมใช้:
  - `/add-source` — เพิ่มแหล่งข้อมูลใหม่ (connector + migration + ทดสอบ)
  - `/add-signal` — เพิ่มสัญญาณ/เกณฑ์ใหม่
  - `/check` — ตรวจ typecheck + test + build ก่อนส่งงาน
  - `/db-export` — export ฐานข้อมูลหลัง migration

เพียงเปิด `claude` ในโฟลเดอร์โปรเจกต์ Claude จะรู้กฎทั้งหมดทันที

### 6. วงจรการพัฒนาที่แนะนำ

```text
1. เปิด VS Code + terminal → รัน bun run dev ไว้ดูผลลัพธ์
2. เปิด terminal อีกอัน → รัน claude
3. บอก Claude สิ่งที่ต้องการ เช่น
   "เพิ่มแหล่งข้อมูลราคายางพาราจาก กยท." หรือพิมพ์ /add-source
4. Claude แก้โค้ด → ตรวจ diff ใน VS Code (Source Control panel)
5. ดูผลจริงที่ http://localhost:8080 (hot reload อัตโนมัติ)
6. บอก Claude "รัน /check" → ต้องผ่าน typecheck + test + build
7. ถ้าแก้ฐานข้อมูล → "รัน /db-export"
8. git add / commit / push ตามปกติ
```

### 7. คำสั่งที่ใช้บ่อย

```bash
bun run dev         # dev server (hot reload)
bun run typecheck   # ตรวจ TypeScript
bun run test        # รันเทสต์
bun run build       # build production
bun run doctor      # ตรวจ env + ฐานข้อมูล
bun run db:export   # export schema หลัง migration
```

### 8. กฎสำคัญที่ Claude Code จะบังคับใช้ (อ่านจาก CLAUDE.md)

- เกณฑ์สัญญาณมาจากหน่วยงานราชการเท่านั้น ผู้อ่านตั้งเองไม่ได้
- ตรรกะตรวจจับ/จัดอันดับอยู่ใน SQL (`detect_core`, `rank_signals`) เท่านั้น
- ห้ามสร้าง/เติม/ย้อนวันที่ข้อมูล — แหล่งที่ดึงไม่ได้ต้องล้มอย่างซื่อสัตย์
- Migration ต้องเพิ่มอย่างเดียว (ไม่ลบ/เปลี่ยนชื่อคอลัมน์) และทุกตาราง public ต้องมี GRANT + RLS
- ห้ามแก้ `src/integrations/supabase/*` และ `src/routeTree.gen.ts` (ไฟล์ generated)
- ห้ามใส่ secret ในโค้ดหรือ commit

### 9. แก้ปัญหาที่พบบ่อย

| ปัญหา | วิธีแก้ |
|---|---|
| `claude` ไม่รู้จักโปรเจกต์ | ต้องรัน `claude` ใน root ของโปรเจกต์ (ที่มี CLAUDE.md) |
| dev server ไม่ขึ้น | รัน `bun run doctor` ดูว่าขาด env ตัวไหน |
| typecheck พังหลัง Claude แก้ | บอก Claude "แก้ typecheck error" — อย่าแก้เองถ้าไม่แน่ใจ |
| ฐานข้อมูลว่าง | รัน `bun run setup` อีกครั้ง (จะ seed ข้อมูลตั้งต้นให้) |

---

## English

### 1. Prerequisites

Git, [Bun](https://bun.sh) (`curl -fsSL https://bun.sh/install | bash`), [VS Code](https://code.visualstudio.com), Node.js 20+, and an Anthropic account.

### 2. Clone and install

```bash
git clone https://github.com/<your-account>/thailands-daily-pulse.git
cd thailands-daily-pulse
bun install
bun run setup      # interactive: .env + database schema/seed
bun run doctor     # verifies env + database
bun run dev        # http://localhost:8080
```

For a zero-config Docker install instead, see [docs/docker.md](docker.md).

### 3. Install Claude Code

```bash
npm install -g @anthropic-ai/claude-code
cd thailands-daily-pulse
claude   # sign in with your Anthropic account on first run
```

### 4. Using Claude Code with VS Code

**Option A — terminal (recommended):** open the project in VS Code, open the integrated terminal (Ctrl+`), run `claude`. You chat in the terminal while VS Code shows every changed file in the Source Control panel for review before commit.

**Option B — VS Code extension:** install "Claude Code" from the Extensions marketplace, press Cmd/Ctrl+Esc to open the Claude panel. It automatically sees your open files and current selection — select code and ask about it directly.

### 5. This repo is pre-configured for Claude Code

- **`CLAUDE.md`** — project rules: commands, folder layout, forbidden actions (never change thresholds, never touch generated files)
- **`AGENTS.md`** — detailed architecture rules (imported by CLAUDE.md)
- **`src/lib/AGENTS.md`** — data-source-specific rules
- **`.claude/commands/`** — ready-made slash commands:
  - `/add-source` — add a new data source (connector + migration + test)
  - `/add-signal` — add a new signal/threshold
  - `/check` — run typecheck + tests + build before finishing
  - `/db-export` — export the database snapshot after a migration

Just run `claude` in the project root — Claude reads all rules automatically.

### 6. Recommended workflow

```text
1. VS Code + terminal → keep bun run dev running
2. Second terminal → run claude
3. Describe the task, e.g. "add a rubber price source" or type /add-source
4. Review Claude's diff in VS Code's Source Control panel
5. Check the result at http://localhost:8080 (hot reload)
6. Ask Claude to run /check — typecheck + tests + build must pass
7. After any DB change → run /db-export
8. git add / commit / push as usual
```

### 7. Common commands

```bash
bun run dev         # dev server (hot reload)
bun run typecheck   # TypeScript check
bun run test        # tests
bun run build       # production build
bun run doctor      # env + database health check
bun run db:export   # export schema after a migration
```

### 8. Rules Claude Code enforces (from CLAUDE.md)

- Signal thresholds come from official sources only; readers never set them
- Detection/ranking logic lives in SQL (`detect_core`, `rank_signals`) only
- Never invent, fill, or backdate data — a blocked source fails honestly
- Migrations are additive; every new public table gets GRANTs + RLS
- Never edit `src/integrations/supabase/*` or `src/routeTree.gen.ts`
- No secrets in code or commits

### 9. Troubleshooting

| Problem | Fix |
|---|---|
| Claude doesn't know the project | Run `claude` in the project root (where CLAUDE.md lives) |
| Dev server won't start | Run `bun run doctor` to find missing env vars |
| Typecheck fails after an edit | Ask Claude to "fix the typecheck errors" |
| Empty database | Re-run `bun run setup` to seed initial data |
