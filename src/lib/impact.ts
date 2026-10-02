// Client-safe, deterministic household impact and official advice per signal. Never AI-generated.

type S = { metric_id: string; family_id: string; prev_value: number | null; new_value: number; change_abs: number | null };

const baht = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toLocaleString("th-TH", { maximumFractionDigits: 0 })} บาท`;
const pay = (n: number) => (n >= 0 ? "จ่ายเพิ่ม" : "ประหยัด");

const PER: Record<string, (ch: number, s: S) => string> = {
  gsh95: (ch) => `รถเก๋งเติมแก๊สโซฮอล์ 95 เต็มถัง 50 ลิตร ${pay(ch)} ${baht(50 * ch).replace(/^[+−]/, "")} ต่อถัง`,
  e20: (ch) => `รถเก๋งเติม E20 เต็มถัง 50 ลิตร ${pay(ch)} ${baht(50 * ch).replace(/^[+−]/, "")} ต่อถัง`,
  diesel: (ch) => `กระบะเติมดีเซลเต็มถัง 70 ลิตร ${pay(ch)} ${baht(70 * ch).replace(/^[+−]/, "")} ต่อถัง`,
  gold_bar: (ch) => `ซื้อทองคำแท่ง 1 บาท ${pay(ch)} ${baht(ch).replace(/^[+−]/, "")}`,
  gold_orn: (ch) => `ซื้อสร้อยทองรูปพรรณ 1 บาท ${pay(ch)} ${baht(ch).replace(/^[+−]/, "")}`,
  pork: (ch) => `ครอบครัวซื้อหมู 2 กก./สัปดาห์ ${pay(ch)} ${baht(2 * ch).replace(/^[+−]/, "")} ต่อสัปดาห์`,
  egg: (ch) => `ซื้อไข่ไก่ 30 ฟอง/เดือน ${pay(ch)} ${baht(30 * ch).replace(/^[+−]/, "")} ต่อเดือน`,
  usdthb: (ch) => `งบเที่ยวต่างประเทศ 1,000 ดอลลาร์ ${pay(ch)} ${baht(1000 * ch).replace(/^[+−]/, "")}`,
  eurthb: (ch) => `งบเที่ยวยุโรป 1,000 ยูโร ${pay(ch)} ${baht(1000 * ch).replace(/^[+−]/, "")}`,
  jpythb: (ch) => `งบเที่ยวญี่ปุ่น 100,000 เยน ${pay(ch)} ${baht(1000 * ch).replace(/^[+−]/, "")}`,
  pm25_bkk: (_c, s) => `ฝุ่น PM2.5 กรุงเทพฯ ${s.new_value.toFixed(0)} µg/m³ (มาตรฐานไทย 37.5)${s.new_value > 37.5 ? ` เกินมาตรฐาน ${(s.new_value / 37.5).toFixed(1)} เท่า` : " อยู่ในเกณฑ์"}`,
  pm25_cnx: (_c, s) => `ฝุ่น PM2.5 เชียงใหม่ ${s.new_value.toFixed(0)} µg/m³ (มาตรฐานไทย 37.5)${s.new_value > 37.5 ? ` เกินมาตรฐาน ${(s.new_value / 37.5).toFixed(1)} เท่า` : " อยู่ในเกณฑ์"}`,
  rain_bkk: (_c, s) => `ฝนพรุ่งนี้ กทม. ประมาณ ${s.new_value.toFixed(0)} มม. — ${s.new_value >= 35 ? "ฝนหนัก อาจมีน้ำรอระบาย เผื่อเวลาเดินทาง" : "ฝนปานกลาง"}`,
  dam_total: (_c, s) => `น้ำในเขื่อนใหญ่ทั้งประเทศ ${s.new_value.toFixed(1)}% ของความจุ`,
};

export function householdImpact(s: S): string | null {
  const ch = Number(s.change_abs ?? (s.prev_value != null ? s.new_value - s.prev_value : 0));
  const calc = impactFor(s);
  if (calc) return impactSummary(calc); // money impact: one formula, same numbers as the shown steps
  const f = PER[s.metric_id];
  return f ? f(ch, s) : null;
}

export type Advice = { text: string; source: string; url: string };

const PCD = "https://air4thai.pcd.go.th";
function pmAdvice(v: number): Advice {
  const text =
    v > 75 ? "ระดับมีผลกระทบต่อสุขภาพ (สีแดง): ทุกคนควรงดกิจกรรมกลางแจ้ง สวมหน้ากาก N95 เมื่อออกนอกอาคาร"
    : v > 37.5 ? "เริ่มมีผลกระทบ (สีส้ม): กลุ่มเสี่ยง เด็ก ผู้สูงอายุ ผู้มีโรคทางเดินหายใจ ควรลดกิจกรรมกลางแจ้งและสวมหน้ากาก"
    : v > 25 ? "ปานกลาง (สีเหลือง): กลุ่มเสี่ยงควรสังเกตอาการ ทำกิจกรรมกลางแจ้งได้ตามปกติ"
    : "คุณภาพอากาศดี ทำกิจกรรมกลางแจ้งได้ตามปกติ";
  return { text, source: "กรมควบคุมมลพิษ (เกณฑ์ AQI)", url: PCD };
}

export function officialAdvice(s: S): Advice | null {
  switch (s.family_id) {
    case "air": return pmAdvice(s.new_value);
    case "weather":
      if (s.metric_id === "quake_max") return { text: "ตรวจสอบประกาศและคำแนะนำล่าสุดจากกรมอุตุนิยมวิทยา หากรู้สึกสั่นไหวให้ออกจากอาคารอย่างปลอดภัย", source: "กรมอุตุนิยมวิทยา", url: "https://earthquake.tmd.go.th" };
      return { text: "ติดตามประกาศเตือนภัยฉบับเต็มของกรมอุตุนิยมวิทยาก่อนเดินทาง", source: "กรมอุตุนิยมวิทยา", url: "https://www.tmd.go.th" };
    case "water": return { text: "ประชาชนในพื้นที่ลุ่มต่ำริมแม่น้ำติดตามประกาศระดับน้ำและการระบายน้ำจากกรมชลประทาน", source: "กรมชลประทาน / สสน.", url: "https://www.thaiwater.net" };
    case "oil": return { text: "ราคาขายปลีกประกาศโดยผู้ค้าน้ำมัน ตรวจสอบราคาหน้าปั๊มและโครงสร้างราคาที่ สนพ.", source: "สำนักงานนโยบายและแผนพลังงาน", url: "https://www.eppo.go.th" };
    case "gold": return { text: "ราคาประกาศอาจเปลี่ยนหลายครั้งต่อวัน ตรวจราคาล่าสุดก่อนซื้อขาย", source: "สมาคมค้าทองคำ", url: "https://www.goldtraders.or.th" };
    case "fx": return { text: "อัตราที่ใช้จริงขึ้นกับธนาคารผู้ให้บริการ ดูอัตราอ้างอิงจากธนาคารแห่งประเทศไทย", source: "ธนาคารแห่งประเทศไทย", url: "https://www.bot.or.th/th/statistics/exchange-rate.html" };
    case "lottery": return { text: "ตรวจผลจากเอกสารทางการของสำนักงานสลากฯ เท่านั้น ระวังผลปลอมในโซเชียล", source: "สำนักงานสลากกินแบ่งรัฐบาล", url: "https://www.glo.or.th/mission/awarding/orderby-time" };
    case "govdata": return { text: "เปิดดูชุดข้อมูลต้นฉบับเพื่อรายละเอียดรายพื้นที่", source: "ศูนย์กลางข้อมูลเปิดภาครัฐ", url: "https://gdcatalog.go.th" };
    default: return null;
  }
}

/** Normalised numbers found in text (commas removed, trailing zeros trimmed) — used to verify AI text adds no numbers. */
export function numbersInText(t: string): string[] {
  return (t.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => {
    const v = n.replace(/,/g, "");
    return v.includes(".") ? v.replace(/0+$/, "").replace(/\.$/, "") : v;
  });
}

export const SEVERITY_WEIGHT = { high: 3, medium: 2, low: 1 } as const;
export const TRUST_FACTOR = { high: 1.0, medium: 0.7, low: 0.5 } as const;
/** Mirrors rank_signals: raw source file changed that day vs previous fetch. */
export const EVIDENCE_FACTOR = { changed: 1.0, unchanged: 0.8 } as const;

/** Reference household daily basket (assumed quantities per day, family of 3–4). Cost is computed only from real observations. */
export const BASKET: { metric_id: string; label: string; qty: number; unit: string }[] = [
  { metric_id: "pork", label: "หมูเนื้อแดง", qty: 0.3, unit: "กก." },
  { metric_id: "chicken", label: "อกไก่", qty: 0.3, unit: "กก." },
  { metric_id: "egg", label: "ไข่ไก่", qty: 4, unit: "ฟอง" },
  { metric_id: "rice_jasmine", label: "ข้าวหอมมะลิ", qty: 0.5, unit: "กก." },
  { metric_id: "morning_glory", label: "ผักบุ้ง", qty: 0.25, unit: "กก." },
  { metric_id: "palm_oil", label: "น้ำมันปาล์ม", qty: 0.05, unit: "ขวด" },
  { metric_id: "gsh95", label: "แก๊สโซฮอล์ 95 (เดินทาง)", qty: 3, unit: "ลิตร" },
];

export type BasketLine = { metric_id: string; label: string; qty: number; unit: string; prev: number | null; cur: number; prevDate: string | null; curDate: string; costPrev: number | null; costCur: number; delta: number };

/** obs must be the real (non-demo) observations sorted newest first. Uses the latest value on/before `date` and the value before that. */
export function basketLines(obs: { metric_id: string; observed_on: string; value: number }[], date: string): BasketLine[] {
  const out: BasketLine[] = [];
  for (const b of BASKET) {
    const rows = obs.filter((o) => o.metric_id === b.metric_id && o.observed_on <= date);
    if (!rows.length) continue;
    const first = rows[0]!; const cur = Number(first.value);
    const prevRow = rows[1];
    const prev = prevRow ? Number(prevRow.value) : null;
    const costCur = cur * b.qty;
    const costPrev = prev == null ? null : prev * b.qty;
    out.push({ ...b, cur, prev, curDate: first.observed_on, prevDate: prevRow?.observed_on ?? null, costCur, costPrev, delta: costPrev == null ? 0 : costCur - costPrev });
  }
  return out;
}

/**
 * Usage assumption per metric for household impact. "daily" items (BASKET + fuel) give baht/day and ×30 per month;
 * "once" items (gold, FX) give the cost difference of one typical purchase. Quantities are fixed, stated assumptions.
 */
type Usage = { label: string; qty: number; unit: string; priceUnit: string; period: "daily" | "once"; scenario: string };
const USAGE: Record<string, Usage> = {
  ...Object.fromEntries(BASKET.map((b) => [b.metric_id, { label: b.label, qty: b.qty, unit: b.unit, priceUnit: `บาท/${b.unit.replace(/\.$/, "")}`, period: "daily" as const, scenario: `ใช้ ${b.qty} ${b.unit}/วัน (ตะกร้าครัวเรือนอ้างอิง)` }])),
  e20: { label: "แก๊สโซฮอล์ E20 (เดินทาง)", qty: 3, unit: "ลิตร", priceUnit: "บาท/ลิตร", period: "daily", scenario: "รถเก๋งใช้ 3 ลิตร/วัน" },
  diesel: { label: "ดีเซล B7 (เดินทาง)", qty: 3, unit: "ลิตร", priceUnit: "บาท/ลิตร", period: "daily", scenario: "กระบะใช้ 3 ลิตร/วัน" },
  gold_bar: { label: "ทองคำแท่ง", qty: 1, unit: "บาททอง", priceUnit: "บาท/บาททอง", period: "once", scenario: "ซื้อทองคำแท่ง 1 บาททอง 1 ครั้ง" },
  gold_orn: { label: "ทองรูปพรรณ", qty: 1, unit: "บาททอง", priceUnit: "บาท/บาททอง", period: "once", scenario: "ซื้อทองรูปพรรณ 1 บาททอง 1 ครั้ง" },
  usdthb: { label: "เงินดอลลาร์", qty: 1000, unit: "ดอลลาร์", priceUnit: "บาท/ดอลลาร์", period: "once", scenario: "แลกเงินเที่ยวต่างประเทศ 1,000 ดอลลาร์" },
  eurthb: { label: "เงินยูโร", qty: 1000, unit: "ยูโร", priceUnit: "บาท/ยูโร", period: "once", scenario: "แลกเงินเที่ยวยุโรป 1,000 ยูโร" },
};

export type ImpactCalc = {
  metric_id: string; label: string; qty: number; unit: string; prev: number; cur: number;
  change: number; period: "daily" | "once"; scenario: string;
  per_day: number | null; per_month: number | null; per_once: number | null;
  steps: string[]; formula: string;
};

const r2 = (n: number) => +n.toFixed(2);
const sgn = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;

/** Structured, recomputable household cost of one real price change. Null if no usage assumption or no previous value. */
export function impactFor(s: { metric_id: string; prev_value: number | null; new_value: number }): ImpactCalc | null {
  const u = USAGE[s.metric_id];
  if (!u || s.prev_value == null) return null;
  const prev = Number(s.prev_value), cur = Number(s.new_value);
  const change = r2(cur - prev);
  const total = r2(change * u.qty);
  const steps = [
    `1. ราคาเปลี่ยน: ${cur} − ${prev} = ${sgn(change)} ${u.priceUnit}`,
    `2. สมมติการใช้: ${u.scenario}`,
    `3. ${sgn(change)} × ${u.qty.toLocaleString("th-TH")} ${u.unit} = ${sgn(total)} บาท${u.period === "daily" ? "/วัน" : " ต่อครั้ง"}`,
  ];
  if (u.period === "daily") steps.push(`4. × 30 วัน = ${sgn(r2(total * 30))} บาท/เดือน`);
  return {
    metric_id: s.metric_id, label: u.label, qty: u.qty, unit: u.unit, prev, cur, change, period: u.period, scenario: u.scenario,
    per_day: u.period === "daily" ? total : null, per_month: u.period === "daily" ? r2(total * 30) : null, per_once: u.period === "once" ? total : null,
    steps,
    formula: u.period === "daily"
      ? `(${cur} − ${prev}) × ${u.qty} ${u.unit}/วัน = ${sgn(total)} บาท/วัน; × 30 = ${sgn(r2(total * 30))} บาท/เดือน`
      : `(${cur} − ${prev}) × ${u.qty} ${u.unit} = ${sgn(total)} บาท ต่อครั้ง`,
  };
}

/** One-line plain summary of an ImpactCalc (same numbers as the steps). */
export function impactSummary(c: ImpactCalc): string {
  const word = (n: number) => (n >= 0 ? "จ่ายเพิ่ม" : "ประหยัด");
  return c.period === "daily"
    ? `${c.scenario}: ${word(c.per_day!)} ${Math.abs(c.per_day!).toLocaleString("th-TH", { maximumFractionDigits: 2 })} บาท/วัน (≈ ${Math.abs(c.per_month!).toLocaleString("th-TH", { maximumFractionDigits: 2 })} บาท/เดือน)`
    : `${c.scenario}: ${word(c.per_once!)} ${Math.abs(c.per_once!).toLocaleString("th-TH", { maximumFractionDigits: 2 })} บาท`;
}
