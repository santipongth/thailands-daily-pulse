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
  rain_bkk: (_c, s) => `ฝนสะสม 24 ชม. กทม. (สถานีกรุงเทพมหานคร) ${s.new_value.toFixed(0)} มม. — ${s.new_value >= 35 ? "ฝนหนัก อาจมีน้ำรอระบาย เผื่อเวลาเดินทาง" : "ฝนปานกลาง"}`,
  dam_pasak_pct: (_c, s) => `เขื่อนป่าสักชลสิทธิ์ ${s.new_value.toFixed(1)}% ของความจุ${s.new_value >= 100 ? " — เกินความจุ ต้องระบายน้ำเพิ่ม พื้นที่ลุ่มต่ำลพบุรี–สระบุรี–อยุธยาติดตามประกาศ" : ""}`,
  dam_pasak_out: (_c, s) => `เขื่อนป่าสักชลสิทธิ์ระบายน้ำ ${s.new_value.toFixed(1)} ล้าน ลบ.ม./วัน ลงแม่น้ำป่าสัก ไหลรวมเจ้าพระยาที่อยุธยา`,
  dam_khundan_pct: (_c, s) => `เขื่อนขุนด่านปราการชล (นครนายก) ${s.new_value.toFixed(1)}% ของความจุ`,
  cp_dam_q: (_c, s) => `เขื่อนเจ้าพระยาระบายน้ำ ${s.new_value.toLocaleString("th-TH")} ลบ.ม./วินาที${s.new_value >= 2500 ? " — ชุมชนนอกคันกั้นน้ำริมเจ้าพระยา (รวม กทม.) เฝ้าระวังน้ำล้นตลิ่ง" : s.new_value >= 2000 ? " — พื้นที่ลุ่มต่ำนอกคันกั้นน้ำ อยุธยา–ปทุมธานี เฝ้าระวัง" : ""}`,
  tmax_bkk: (_c, s) => `อุณหภูมิสูงสุดเมื่อวานที่สถานีกรุงเทพมหานคร ${s.new_value.toFixed(1)}°C`,
};

export function householdImpact(s: S): string | null {
  const ch = Number(s.change_abs ?? (s.prev_value != null ? s.new_value - s.prev_value : 0));
  const calc = impactFor(s);
  if (calc) return impactSummary(calc); // money impact: one formula, same numbers as the shown steps
  const f = PER[s.metric_id];
  return f ? f(ch, s) : null;
}

export type Advice = { text: string; source: string; url: string };

const PCD = "https://pm25.gistda.or.th";
function pmAdvice(v: number): Advice {
  const text =
    v > 75 ? "ระดับมีผลกระทบต่อสุขภาพ (สีแดง): ทุกคนควรงดกิจกรรมกลางแจ้ง สวมหน้ากาก N95 เมื่อออกนอกอาคาร"
    : v > 37.5 ? "เริ่มมีผลกระทบ (สีส้ม): กลุ่มเสี่ยง เด็ก ผู้สูงอายุ ผู้มีโรคทางเดินหายใจ ควรลดกิจกรรมกลางแจ้งและสวมหน้ากาก"
    : v > 25 ? "ปานกลาง (สีเหลือง): กลุ่มเสี่ยงควรสังเกตอาการ ทำกิจกรรมกลางแจ้งได้ตามปกติ"
    : "คุณภาพอากาศดี ทำกิจกรรมกลางแจ้งได้ตามปกติ";
  return { text, source: "เกณฑ์ AQI กรมควบคุมมลพิษ · ค่าจาก GISTDA", url: PCD };
}

export function officialAdvice(s: S): Advice | null {
  switch (s.family_id) {
    case "air": return pmAdvice(s.new_value);
    case "weather":
      if (s.metric_id === "quake_th") return { text: "ตรวจสอบประกาศและคำแนะนำล่าสุดจากกรมอุตุนิยมวิทยา หากรู้สึกสั่นไหวให้ออกจากอาคารอย่างปลอดภัย", source: "กรมอุตุนิยมวิทยา", url: "https://earthquake.tmd.go.th" };
      return { text: "ติดตามประกาศเตือนภัยฉบับเต็มของกรมอุตุนิยมวิทยาก่อนเดินทาง", source: "กรมอุตุนิยมวิทยา", url: "https://data.tmd.go.th" };
    case "water": return { text: "ประชาชนในพื้นที่ลุ่มต่ำริมแม่น้ำติดตามประกาศระดับน้ำและการระบายน้ำจากกรมชลประทาน", source: "กรมชลประทาน / สสน.", url: "https://www.thaiwater.net" };
    case "oil": return { text: "ราคาขายปลีกประกาศโดยผู้ค้าน้ำมัน ตรวจสอบราคาหน้าปั๊มและโครงสร้างราคาที่ สนพ.", source: "สำนักงานนโยบายและแผนพลังงาน", url: "https://www.eppo.go.th" };
    case "gold": return { text: "ราคาประกาศอาจเปลี่ยนหลายครั้งต่อวัน ตรวจราคาล่าสุดก่อนซื้อขาย", source: "สมาคมค้าทองคำ", url: "https://www.goldtraders.or.th" };
    case "fx": return { text: "อัตราที่ใช้จริงขึ้นกับธนาคารผู้ให้บริการ ดูอัตราอ้างอิงจากธนาคารแห่งประเทศไทย", source: "ธนาคารแห่งประเทศไทย", url: "https://www.bot.or.th/th/statistics/exchange-rate.html" };
    case "lottery": return { text: "ตรวจผลจากเอกสารทางการของสำนักงานสลากฯ เท่านั้น ระวังผลปลอมในโซเชียล", source: "สำนักงานสลากกินแบ่งรัฐบาล", url: "https://www.glo.or.th/mission/awarding/orderby-time" };
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

/** Reference household daily basket — quantities come from USAGE (official per-household figures where available). */
export const BASKET: { metric_id: string; label: string; qty: number; unit: string }[] = [
  { metric_id: "pork", label: "หมูเนื้อแดง", qty: 0.18, unit: "กก." },
  { metric_id: "chicken", label: "เนื้อไก่", qty: 0.27, unit: "กก." },
  { metric_id: "egg", label: "ไข่ไก่", qty: 1.54, unit: "ฟอง" },
  { metric_id: "rice_jasmine", label: "ข้าวสาร", qty: 0.62, unit: "กก." },
  { metric_id: "morning_glory", label: "ผักบุ้ง", qty: 0.25, unit: "กก." },
  { metric_id: "palm_oil", label: "น้ำมันปาล์ม", qty: 0.05, unit: "ขวด" },
  { metric_id: "gsh95", label: "แก๊สโซฮอล์ 95", qty: 0.73, unit: "ลิตร" },
  { metric_id: "elec_unit", label: "ค่าไฟฟ้า", qty: 6.5, unit: "หน่วย" },
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
 * Usage per metric for household impact. "daily" items give baht/day and ×30 per month;
 * "once" items (gold, FX) give the cost difference of one purchase.
 * Official figures: national/per-person consumption from government reports ÷ households or × household size (NSO avg 3.0 persons).
 * `official: false` = example amount (no government per-household figure exists).
 */
export type Usage = {
  label: string; qty: number; unit: string; priceUnit: string; period: "daily" | "once"; scenario: string;
  official: boolean; source: string; method: string; url?: string;
};
const HH = "ขนาดครัวเรือนเฉลี่ย 3.0 คน (สำนักงานสถิติแห่งชาติ)";
export const USAGE: Record<string, Usage> = {
  pork: { label: "หมูเนื้อแดง", qty: 0.18, unit: "กก.", priceUnit: "บาท/กก.", period: "daily", scenario: "ครัวเรือนเฉลี่ยบริโภค 0.18 กก./วัน", official: true, source: "กรมปศุสัตว์ — การบริโภคเนื้อสุกร 21.7 กก./คน/ปี (ปี 2565)", method: `21.7 กก. × 3 คน ÷ 365 วัน; ${HH}`, url: "https://isaninsight.kku.ac.th/archives/8724" },
  chicken: { label: "เนื้อไก่", qty: 0.27, unit: "กก.", priceUnit: "บาท/กก.", period: "daily", scenario: "ครัวเรือนเฉลี่ยบริโภค 0.27 กก./วัน", official: true, source: "กรมปศุสัตว์ — การบริโภคเนื้อไก่ 32.9 กก./คน/ปี (ปี 2565)", method: `32.9 กก. × 3 คน ÷ 365 วัน; ${HH}`, url: "https://isaninsight.kku.ac.th/archives/8724" },
  egg: { label: "ไข่ไก่", qty: 1.54, unit: "ฟอง", priceUnit: "บาท/ฟอง", period: "daily", scenario: "ครัวเรือนเฉลี่ยบริโภค 1.54 ฟอง/วัน", official: true, source: "กรมปศุสัตว์ — บริโภคไข่ไก่ทั้งประเทศ 41.50 ล้านฟอง/วัน (ปี 2568)", method: "41.50 ล้านฟอง ÷ 27 ล้านครัวเรือน", url: "https://www.eatecon.com/2025/10/10/egg-consumption/" },
  rice_jasmine: { label: "ข้าวสาร", qty: 0.62, unit: "กก.", priceUnit: "บาท/กก.", period: "daily", scenario: "ครัวเรือนเฉลี่ยบริโภคข้าว 0.62 กก./วัน", official: true, source: "กรมการค้าภายใน — บริโภคข้าว 75.65 กก./คน/ปี (แผนความต้องการใช้ข้าว 2567/68)", method: `75.65 กก. × 3 คน ÷ 365 วัน; ${HH}`, url: "https://www.thansettakij.com/business/trade-agriculture/594161" },
  morning_glory: { label: "ผักบุ้ง", qty: 0.25, unit: "กก.", priceUnit: "บาท/กก.", period: "daily", scenario: "ตัวอย่าง: ใช้ 0.25 กก./วัน", official: false, source: "ตัวเลขสมมติ — ยังไม่มีแหล่งรัฐ", method: "ตัวอย่างการทำกับข้าว 1 มื้อ" },
  palm_oil: { label: "น้ำมันปาล์ม", qty: 0.05, unit: "ขวด", priceUnit: "บาท/ขวด", period: "daily", scenario: "ตัวอย่าง: ใช้ 0.05 ขวด/วัน", official: false, source: "ตัวเลขสมมติ — ยังไม่มีแหล่งรัฐ", method: "1 ขวด 1 ลิตร ใช้ราว 20 วัน" },
  gsh95: { label: "แก๊สโซฮอล์ 95", qty: 0.73, unit: "ลิตร", priceUnit: "บาท/ลิตร", period: "daily", scenario: "เฉลี่ยต่อครัวเรือน 0.73 ลิตร/วัน", official: true, source: "กรมธุรกิจพลังงาน — ใช้แก๊สโซฮอล์ 95 ทั้งประเทศ 19.69 ล้านลิตร/วัน (ปี 2568)", method: "19.69 ล้านลิตร ÷ 27 ล้านครัวเรือน", url: "https://www.pptvhd36.com/wealth/economic/268526" },
  e20: { label: "แก๊สโซฮอล์ E20", qty: 0.19, unit: "ลิตร", priceUnit: "บาท/ลิตร", period: "daily", scenario: "เฉลี่ยต่อครัวเรือน 0.19 ลิตร/วัน", official: true, source: "กรมธุรกิจพลังงาน — ใช้ E20 ทั้งประเทศ 5.06 ล้านลิตร/วัน (ปี 2568)", method: "5.06 ล้านลิตร ÷ 27 ล้านครัวเรือน", url: "https://www.pptvhd36.com/wealth/economic/268526" },
  diesel: { label: "ดีเซล", qty: 2.41, unit: "ลิตร", priceUnit: "บาท/ลิตร", period: "daily", scenario: "เฉลี่ยต่อครัวเรือน 2.41 ลิตร/วัน (รวมรถขนส่งที่ส่งต่อมาในราคาสินค้า)", official: true, source: "กรมธุรกิจพลังงาน — ใช้ดีเซลหมุนเร็วทั้งประเทศ 65.03 ล้านลิตร/วัน (ปี 2568)", method: "65.03 ล้านลิตร ÷ 27 ล้านครัวเรือน", url: "https://www.pptvhd36.com/wealth/economic/268526" },
  elec_unit: { label: "ค่าไฟฟ้า", qty: 6.5, unit: "หน่วย", priceUnit: "บาท/หน่วย", period: "daily", scenario: "บ้านใช้ไฟ 6.5 หน่วย/วัน (≈200 หน่วย/เดือน)", official: false, source: "ค่าที่ผู้ดูแลยืนยัน: บ้านทั่วไปใน กทม. ≈200 หน่วย/เดือน", method: "ราคา/หน่วย = (อัตราบ้านอยู่อาศัย 1.1.2 + Ft + ค่าบริการ 24.62) × VAT 7% ÷ 200 หน่วย", url: "https://www.pea.co.th/our-services/tariff/ft" },
  gold_bar: { label: "ทองคำแท่ง", qty: 1, unit: "บาททอง", priceUnit: "บาท/บาททอง", period: "once", scenario: "ตัวอย่าง: ซื้อ 1 บาททอง 1 ครั้ง", official: false, source: "ไม่มีตัวเลขรัฐต่อครัวเรือน — ตัวอย่างการซื้อ", method: "1 ครั้ง" },
  gold_orn: { label: "ทองรูปพรรณ", qty: 1, unit: "บาททอง", priceUnit: "บาท/บาททอง", period: "once", scenario: "ตัวอย่าง: ซื้อ 1 บาททอง 1 ครั้ง", official: false, source: "ไม่มีตัวเลขรัฐต่อครัวเรือน — ตัวอย่างการซื้อ", method: "1 ครั้ง" },
  usdthb: { label: "เงินดอลลาร์", qty: 1000, unit: "ดอลลาร์", priceUnit: "บาท/ดอลลาร์", period: "once", scenario: "ตัวอย่าง: แลก 1,000 ดอลลาร์", official: false, source: "ไม่มีตัวเลขรัฐต่อครัวเรือน — ตัวอย่างการแลกเงิน", method: "1 ทริป" },
  eurthb: { label: "เงินยูโร", qty: 1000, unit: "ยูโร", priceUnit: "บาท/ยูโร", period: "once", scenario: "ตัวอย่าง: แลก 1,000 ยูโร", official: false, source: "ไม่มีตัวเลขรัฐต่อครัวเรือน — ตัวอย่างการแลกเงิน", method: "1 ทริป" },
};

export type ImpactCalc = {
  metric_id: string; label: string; qty: number; unit: string; prev: number; cur: number;
  change: number; period: "daily" | "once"; scenario: string;
  per_day: number | null; per_month: number | null; per_once: number | null;
  steps: string[]; formula: string; source?: string; official?: boolean;
};

const r2 = (n: number) => +n.toFixed(2);
const sgn = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;

/** Structured, recomputable household cost of one real price change. `qtyOverride` = user's own usage (device only). */
export function impactFor(s: { metric_id: string; prev_value: number | null; new_value: number }, qtyOverride?: number): ImpactCalc | null {
  const base = USAGE[s.metric_id];
  if (!base || s.prev_value == null) return null;
  const u = qtyOverride != null && qtyOverride !== base.qty ? { ...base, qty: qtyOverride, scenario: `ตัวเลขของฉัน: ${qtyOverride} ${base.unit}${base.period === "daily" ? "/วัน" : " ต่อครั้ง"}` } : base;
  const prev = Number(s.prev_value), cur = Number(s.new_value);
  const change = r2(cur - prev);
  const total = r2(change * u.qty);
  const steps = [
    `1. ราคาเปลี่ยน: ${cur} − ${prev} = ${sgn(change)} ${u.priceUnit}`,
    `2. การใช้: ${u.scenario} (${u.official && u === base ? `ที่มา: ${u.source}` : u.source})`,
    `3. ${sgn(change)} × ${u.qty.toLocaleString("th-TH")} ${u.unit} = ${sgn(total)} บาท${u.period === "daily" ? "/วัน" : " ต่อครั้ง"}`,
  ];
  if (u.period === "daily") steps.push(`4. × 30 วัน = ${sgn(r2(total * 30))} บาท/เดือน`);
  return {
    metric_id: s.metric_id, label: u.label, qty: u.qty, unit: u.unit, prev, cur, change, period: u.period, scenario: u.scenario,
    per_day: u.period === "daily" ? total : null, per_month: u.period === "daily" ? r2(total * 30) : null, per_once: u.period === "once" ? total : null,
    steps, source: base.source, official: base.official,
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
