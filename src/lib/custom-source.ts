// Pure, browser-safe parsers for admin-defined sources (custom_sources). No fetching here.
export type CustomFormat = "json" | "csv" | "text";
export type CustomCfg = { format: CustomFormat; value_path: string; date_path?: string | null; row_match?: string | null };
export type Extracted = { value: number; date: string | null; snippet: string };

/** "1,234.50 บาท" → 1234.5; rejects anything without a finite number. */
export function toNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const m = v.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  const n = m ? Number(m[0]) : NaN;
  return Number.isFinite(n) ? n : null;
}

const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const TH_FULL = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const ymd = (y: number, m: number, d: number) => {
  if (y > 2400) y -= 543; // Buddhist era
  if (y < 100) y += y > 50 ? 1900 : 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

/** ISO, DD/MM/YYYY (also พ.ศ.) or "4 ต.ค. 2569" → YYYY-MM-DD; null if not a date. */
export function toDate(v: unknown): string | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const s = String(v).trim();
  let m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return ymd(+m[1]!, +m[2]!, +m[3]!);
  m = s.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) return ymd(+m[3]!, +m[2]!, +m[1]!);
  for (const [list, i] of [[TH_FULL, 0], [TH_MONTHS, 0]] as const) {
    for (let k = 0; k < list.length; k++) {
      const re = new RegExp(`(\\d{1,2})\\s*${list[k]!.replace(/\./g, "\\.")}\\s*(\\d{2,4})`);
      const t = s.match(re);
      if (t) return ymd(+t[2]!, k + 1 + i, +t[1]!);
    }
  }
  return null;
}

/** data.items[0].price — dotted path with [n] indexes (n = -1 → last). */
export function getPath(obj: unknown, path: string): unknown {
  let cur: any = obj;
  for (const part of path.replace(/\[(-?\d+)\]/g, ".$1").split(".").filter(Boolean)) {
    if (cur == null) return undefined;
    if (Array.isArray(cur) && /^-?\d+$/.test(part)) { const i = Number(part); cur = cur[i < 0 ? cur.length + i : i]; }
    else cur = cur[part];
  }
  return cur;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let f = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (q) { if (c === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; continue; }
    if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); f = ""; if (row.some((x) => x !== "")) rows.push(row); row = []; }
    else f += c;
  }
  row.push(f); if (row.some((x) => x !== "")) rows.push(row);
  return rows;
}

/** Picks the CSV row: "column=value" match (last match wins), else the last row. */
function csvRow(rows: string[][], match?: string | null): Record<string, string> | null {
  const [head, ...body] = rows;
  if (!head || !body.length) return null;
  const objs = body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
  if (!match) return objs[objs.length - 1] ?? null;
  const [k, ...v] = match.split("=");
  const want = v.join("=").trim();
  return objs.filter((o) => o[k!.trim()] === want).pop() ?? null;
}

const stripHtml = (s: string) => s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");

function regexPick(text: string, pattern: string): { hit: string; around: string } | null {
  let re: RegExp;
  try { re = new RegExp(pattern, "i"); } catch { throw new Error("รูปแบบค้นหา (regex) ไม่ถูกต้อง"); }
  const m = text.match(re);
  if (!m) return null;
  const at = m.index ?? 0;
  return { hit: m[1] ?? m[0], around: text.slice(Math.max(0, at - 60), at + m[0].length + 60) };
}

/** Extract the value (required) and the source's own date (optional) from a fetched body. */
export function extractCustom(body: string, cfg: CustomCfg): Extracted {
  let rawV: unknown; let rawD: unknown = null; let snippet = "";
  if (cfg.format === "json") {
    let j: unknown;
    try { j = JSON.parse(body); } catch { throw new Error("ไฟล์ไม่ใช่ JSON"); }
    rawV = getPath(j, cfg.value_path);
    if (cfg.date_path) rawD = getPath(j, cfg.date_path);
    snippet = `${cfg.value_path} = ${JSON.stringify(rawV)}${cfg.date_path ? ` · ${cfg.date_path} = ${JSON.stringify(rawD)}` : ""}`;
  } else if (cfg.format === "csv") {
    const row = csvRow(parseCsv(body), cfg.row_match);
    if (!row) throw new Error("ไม่พบแถวที่ตรงเงื่อนไขใน CSV");
    if (!(cfg.value_path in row)) throw new Error(`ไม่พบคอลัมน์ "${cfg.value_path}" — มี: ${Object.keys(row).join(", ")}`.slice(0, 280));
    rawV = row[cfg.value_path];
    if (cfg.date_path) rawD = row[cfg.date_path];
    snippet = JSON.stringify(row).slice(0, 300);
  } else {
    const t = stripHtml(body);
    const v = regexPick(t, cfg.value_path);
    rawV = v?.hit; snippet = v?.around ?? "";
    if (cfg.date_path) rawD = regexPick(t, cfg.date_path)?.hit ?? null;
  }
  const value = toNumber(rawV);
  if (value === null) throw new Error(`หาค่าตัวเลขไม่เจอ (ได้: ${JSON.stringify(rawV ?? null).slice(0, 80)})`);
  const date = rawD == null || rawD === "" ? null : toDate(rawD);
  if (cfg.date_path && rawD && !date) throw new Error(`อ่านวันที่ไม่ได้: ${String(rawD).slice(0, 60)}`);
  return { value, date, snippet };
}

/** Simple preview of a rule over stored readings (consecutive changes; no volatility filter). */
export function previewRule(rows: { observed_on: string; value: number }[], r: { kind: string; threshold_abs?: number | null; threshold_pct?: number | null; bands?: number[] | null }) {
  const out: { date: string; prev: number; cur: number; why: string }[] = [];
  const s = [...rows].sort((a, b) => a.observed_on.localeCompare(b.observed_on));
  for (let i = 1; i < s.length; i++) {
    const p = s[i - 1]!.value, c = s[i]!.value, d = s[i]!.observed_on;
    if (r.kind === "release") { if (c !== p) out.push({ date: d, prev: p, cur: c, why: "ค่าประกาศใหม่" }); continue; }
    if (r.kind === "level") {
      const b = r.bands ?? []; const bp = b.filter((x) => p >= x).length, bc = b.filter((x) => c >= x).length;
      if (bp !== bc) out.push({ date: d, prev: p, cur: c, why: `ข้ามระดับ ${bp} → ${bc}` });
      continue;
    }
    const ch = c - p, pct = p ? (ch / Math.abs(p)) * 100 : null;
    const hitAbs = r.threshold_abs ? Math.abs(ch) >= r.threshold_abs : false;
    const hitPct = r.threshold_pct && pct !== null ? Math.abs(pct) >= r.threshold_pct : false;
    if (hitAbs || hitPct) out.push({ date: d, prev: p, cur: c, why: `${ch > 0 ? "+" : ""}${ch.toFixed(2)}${pct !== null ? ` (${pct.toFixed(1)}%)` : ""}` });
  }
  return out;
}
