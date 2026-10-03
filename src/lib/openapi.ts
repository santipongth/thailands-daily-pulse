// Single source of truth for Public API v1: used by the handler, OpenAPI JSON and /developers pages.
// Browser-safe (no server imports).
export const SITE = "https://thailands-daily-pulse.lovable.app";
export const API_BASE = `${SITE}/api/public/v1`;
export const DOCS_UPDATED = "2026-10-04";

export type ApiTable =
  | "daily_briefs" | "brief_updates" | "signals" | "signal_events" | "source_registry" | "source_run_history"
  | "observations" | "dam_readings" | "weather_station_obs" | "lottery_draws" | "social_posts" | "news_items"
  | "holidays" | "tax_deadlines" | "release_calendar" | "raw_evidence";

export type ApiResource = {
  path: string; table: ApiTable; order: string; date?: string; id?: string; idHint?: string;
  note?: string; group: string; th: string; description: string; fields: string[];
};

export const API_SPEC: ApiResource[] = [
  { path: "briefs", table: "daily_briefs", order: "brief_date", date: "brief_date", group: "Brief", th: "สรุปประจำวัน 06:00 พร้อมช่วงข้อมูลและความครบถ้วน", description: "Daily Briefs with data window and completeness", fields: ["brief_date", "edition", "body", "items", "generated_at", "cutoff_at", "published_at", "completeness", "data_window", "signature"] },
  { path: "brief-updates", table: "brief_updates", order: "created_at", date: "brief_date", group: "Brief", th: "อัปเดตที่เข้ามาหลังตัดรอบ Brief (แก้ไข/ถอน/ข้อมูลมาช้า)", description: "Updates received after the brief cutoff", fields: ["id", "brief_date", "kind", "title", "body", "event_id", "version", "created_at"] },
  { path: "signals", table: "signals", order: "signal_date", date: "signal_date", id: "metric_id", idHint: "lpg", group: "Signals", th: "การเปลี่ยนแปลงที่ผ่านเกณฑ์ทางการ (ทุกระดับ)", description: "Detected meaningful changes (all severities)", fields: ["id", "family_id", "metric_id", "signal_date", "severity", "title", "prev_value", "new_value", "change_abs", "change_pct", "score", "checks", "is_demo", "created_at"] },
  { path: "events", table: "signal_events", order: "signal_date", date: "signal_date", id: "event_id", idHint: "lpg:2026-10-04", group: "Signals", th: "เหตุการณ์แบบมีเวอร์ชัน (active/withdrawn)", description: "Versioned signal events", fields: ["event_id", "metric_id", "family_id", "event_type", "area", "signal_date", "status", "current_version", "is_demo", "first_seen_at", "updated_at"] },
  { path: "observations", table: "observations", order: "observed_on", date: "observed_on", id: "metric_id", idHint: "lpg", group: "Data", th: "ค่าตัวเลขที่เก็บได้จริง พร้อมวันที่อ้างอิง/มีผล/ได้รับ", description: "Public numeric observations", fields: ["id", "metric_id", "observed_on", "value", "period_start", "period_end", "published_at", "received_at", "effective_from", "evidence_id", "is_demo", "created_at"] },
  { path: "dams", table: "dam_readings", order: "read_at", id: "metric_id", idHint: "cp_dam_q", group: "Data", th: "ค่าเขื่อนรายชั่วโมงที่กระทบกรุงเทพฯ", description: "Hourly dam readings", fields: ["id", "metric_id", "value", "observed_on", "read_at"] },
  { path: "weather", table: "weather_station_obs", order: "received_at", date: "obs_date", id: "station_id", idHint: "48455", group: "Data", th: "สถานีตรวจอากาศกรมอุตุฯ ใกล้กรุงเทพฯ (ราย 3 ชม./7 วัน)", description: "Bangkok-area TMD station observations", fields: ["id", "station_id", "name", "kind", "obs_date", "obs_time", "temp", "tmin", "rain24", "rain_pct", "descr", "dist_km", "source_url", "received_at"] },
  { path: "lottery", table: "lottery_draws", order: "draw_date", group: "Data", th: "ผลสลากที่ยืนยันแล้ว ใหม่สุดก่อน", description: "Verified GLO lottery draws", fields: ["draw_date", "first", "last2", "front3", "back3", "pdf_url", "video_url", "verified", "fetched_at"] },
  { path: "sources", table: "source_registry", order: "source", id: "source", group: "Sources", th: "ทะเบียนแหล่งข้อมูล เจ้าของ ช่องทาง ใบอนุญาต รอบอัปเดต", description: "Public source registry", fields: ["source", "owner", "channel", "licence", "cadence", "unit", "area", "stale_after_days", "url", "sort"] },
  { path: "source-health", table: "source_run_history", order: "ran_at", id: "source", group: "Sources", th: "ผลการดึงข้อมูลแต่ละรอบ (30 วัน) พร้อมเหตุผลที่ล้มเหลว", description: "Recent source collection outcomes", fields: ["id", "source", "ran_at", "ok", "rows", "error", "run_kind"] },
  { path: "evidence", table: "raw_evidence", order: "fetched_at", id: "source", group: "Sources", th: "metadata ของไฟล์หลักฐานดิบ (ไม่มีไฟล์/ที่เก็บ)", description: "Raw evidence metadata only", fields: ["id", "source", "url", "http_status", "content_type", "bytes", "sha256", "fetched_at"] },
  { path: "social", table: "social_posts", order: "posted_at", note: "Context only; not a verified signal.", group: "Context", th: "โพสต์ FM91 / BTS / MRT — บริบทเท่านั้น", description: "FM91 and rail posts; context, not signals", fields: ["id", "post_id", "source", "posted_at", "received_at", "text", "url", "is_bkk", "area", "summary", "ai_reason", "rail_status", "rail_reason", "rail_day", "evidence_id"] },
  { path: "news", table: "news_items", order: "published_at", note: "Context only; never creates or ranks a signal.", group: "Context", th: "ข่าว RSS ที่ติดแท็ก + ข่าวทั่วไป — บริบทเท่านั้น", description: "Tagged and general news; never signals", fields: ["id", "source", "title", "link", "published_at", "agency", "family_id", "kind", "created_at"] },
  { path: "holidays", table: "holidays", order: "holiday_date", group: "Calendar", th: "วันหยุดราชการ/ธนาคาร", description: "Public holidays", fields: ["id", "holiday_date", "name", "kind", "note", "created_at"] },
  { path: "tax-deadlines", table: "tax_deadlines", order: "due_date", group: "Calendar", th: "กำหนดยื่นภาษี (กรมสรรพากร)", description: "Tax filing deadlines", fields: ["id", "due_date", "channel", "items", "source_url", "fetched_at"] },
  { path: "calendar", table: "release_calendar", order: "release_date", group: "Calendar", th: "กำหนดเผยแพร่ข้อมูลทางการ", description: "Official release calendar", fields: ["id", "family_id", "title", "release_date"] },
];

/** @deprecated kept for older imports */
export const API_RESOURCES = API_SPEC.map((r) => [r.path, r.description] as const);

export const API_ERRORS = [
  ["400", "invalid_query", "date ไม่ใช่ YYYY-MM-DD หรือ id ยาวเกิน 160 ตัวอักษร"],
  ["403", "forbidden_resource", "resource ไม่ได้เปิดเป็นสาธารณะ"],
  ["404", "not_found", "ไม่มี resource นี้"],
  ["429", "rate_limited", "เกิน 120 คำขอ/นาที/IP — รอตาม Retry-After (60 วินาที)"],
  ["500", "read_failed", "อ่านฐานข้อมูลไม่สำเร็จ"],
] as const;

const errorSchema = { type: "object", required: ["error"], properties: { error: { type: "object", required: ["code", "message"], properties: { code: { type: "string" }, message: { type: "string" } } } } };
const metaSchema = { type: "object", properties: { resource: { type: "string" }, count: { type: "integer" }, limit: { type: "integer" }, timezone: { const: "Asia/Bangkok" }, read_only: { const: true }, note: { type: ["string", "null"] } } };
const err = (d: string) => ({ description: d, content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } });

export const openApiDocument = {
  openapi: "3.1.0",
  info: { title: "Thailand Daily Signals Public API", version: "1.1.0", description: `Read-only public data API (updated ${DOCS_UPDATED}). GET only, no key, CORS *, cache 60s, max 120 requests/min/IP. Times are ISO 8601 (UTC); civic dates use Asia/Bangkok. Social and news records never create signals.` },
  servers: [{ url: API_BASE }],
  paths: {
    ...Object.fromEntries(API_SPEC.map((r) => [`/${r.path}`, { get: {
      tags: [r.group], summary: r.description, operationId: `list_${r.path.replaceAll("-", "_")}`,
      description: `Table ${r.table}, newest first by ${r.order}.${r.date ? ` date filters ${r.date}.` : ""}${r.id ? ` id filters ${r.id}.` : ""}${r.note ? ` ${r.note}` : ""}`,
      parameters: [
        { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 25 } },
        ...(r.date ? [{ name: "date", in: "query", description: `Filter ${r.date} (YYYY-MM-DD)`, schema: { type: "string", format: "date" } }] : []),
        ...(r.id ? [{ name: "id", in: "query", description: `Filter ${r.id}`, example: r.idHint, schema: { type: "string", maxLength: 160 } }] : []),
      ],
      responses: {
        "200": { description: "Public records", content: { "application/json": { schema: { type: "object", required: ["data", "meta"], properties: { data: { type: "array", items: { type: "object", properties: Object.fromEntries(r.fields.map((f) => [f, {}])) } }, meta: { $ref: "#/components/schemas/Meta" } } } } } },
        "400": err("Invalid query"), "429": err("Rate limited (Retry-After: 60)"), "500": err("Read failed"),
      },
    } }])),
    "/health": { servers: [{ url: `${SITE}/api/public` }], get: { tags: ["Ops"], summary: "System health (no-store)", operationId: "get_health", responses: { "200": { description: "ok or degraded: database, queue, brief, sources{fresh,stale,paused,items}" }, "503": { description: "Database down or today's brief missing after 06:30" } } } },
  },
  components: { schemas: { Error: errorSchema, Meta: metaSchema } },
} as const;
