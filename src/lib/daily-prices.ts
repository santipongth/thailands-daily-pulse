/** Do not mistake a page refresh for a new price or a new wage announcement. */
export const LPG_URL = "https://www.eppo.go.th/wp-json/oil-api/v1/lpg-prices";
export const WAGE_URL = "https://www.mol.go.th/news/เริ่ม-1-กรกฎาคมนี้-กระทรวงแรงงาน-ปรับใหม่ค่าแรงขั้นต่ำ-สอดรับเศรษฐกิจ-ยกระดับคุณภาพชีวิตแรงงาน";
export const WAGE_INDEX_URL = "https://www.mol.go.th/อัตราค่าจ้างขั้นต่ำ";

export function verifyWageNotice(index: string, effective: string) {
  if (/Incapsula|incident_id|Request unsuccessful|Access Denied/i.test(index)) throw new Error("ดัชนีประกาศค่าแรงกระทรวงแรงงานถูกปิดกั้น");
  const normalized = index.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
  // The ministry index identifies the governing notice; an old article alone cannot establish today's rate.
  const notices = [...normalized.matchAll(/อัตราค่าจ้างขั้นต่ำ\s*\(ฉบับที่\s*(\d+)\)/g)].map((m) => Number(m[1]));
  if (!notices.length || Math.max(...notices) !== 14 || effective !== "2025-07-01")
    throw new Error("ประกาศค่าแรงล่าสุดไม่ตรงกับประกาศที่ใช้ดึงอัตรา — ต้องตรวจสอบฉบับใหม่");
}

export function thaiPriceDate(raw: unknown) {
  const match = String(raw ?? "").match(/(\d{1,2})\s+(มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\s+(25\d{2}|20\d{2})/);
  if (!match) throw new Error("ไม่มีวันที่ประกาศราคาน้ำมัน");
  const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  return `${Number(match[3]) > 2400 ? Number(match[3]) - 543 : match[3]}-${String(months.indexOf(match[2] ?? "") + 1).padStart(2, "0")}-${String(match[1]).padStart(2, "0")}`;
}

export function parseLpg(data: any, today: string) {
  const p = data?.data?.ptt;
  const date = String(p?.lpg_ptt_date ?? "");
  const price = Number(p?.lpg_ptt_15kg);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(price) || price <= 0) throw new Error("ไม่มีราคาถัง 15 กก. ของ ปตท. ที่ระบุวันที่");
  const age = (Date.parse(today + "T00:00:00Z") - Date.parse(date + "T00:00:00Z")) / 86400e3;
  if (!Number.isFinite(age) || age < 0 || age > 45) throw new Error(`ราคา LPG ปตท. ลงวันที่ ${date} — เก่าเกิน 45 วัน ไม่บันทึกเป็นราคาปัจจุบัน`);
  return { price, date };
}

export function parseBangkokWage(page: string, today: string) {
  if (/Incapsula|incident_id|Request unsuccessful|Access Denied/i.test(page)) throw new Error("เว็บไซต์กระทรวงแรงงานปิดกั้นการเข้าถึง");
  const plain = page.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
  const match = plain.match(/(?:กรุงเทพมหานคร|กรุงเทพฯ).{0,120}?(?:วันละ|อัตรา(?:ค่าจ้าง)?(?:ขั้นต่ำ)?).{0,40}?(\d{3,4})\s*บาท/)
    ?? plain.match(/(?:อัตราค่าจ้างขั้นต่ำเป็นวันละ|\b\d{1,2}\s*กลุ่ม\s*ได้แก่.{0,30}?วันละ)\s*(\d{3,4})\s*บาท.{0,60}?กรุงเทพมหานคร/)
    ?? plain.match(/(?:•|-)\s*(\d{3,4})\s*บาท:\s*กรุงเทพมหานคร/);
  const date = plain.match(/(?:มีผล(?:บังคับ)?ใช้(?:ตั้งแต่วันที่)?|ตั้งแต่วันที่)\s*(\d{1,2})\s*(มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\s*(25\d{2}|20\d{2})/);
  if (!match || !date) throw new Error("ไม่พบค่าแรงกรุงเทพฯ และวันมีผลบังคับใช้ในประกาศเดียวกัน");
  const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const iso = `${Number(date[3]) > 2400 ? Number(date[3]) - 543 : date[3]}-${String(months.indexOf(date[2]!) + 1).padStart(2, "0")}-${String(date[1]).padStart(2, "0")}`;
  const price = Number(match[1]);
  if (iso > today || price < 300 || price > 1500) throw new Error("ข้อมูลค่าแรงหรือวันมีผลไม่สมเหตุสมผล");
  return { price, date: iso };
}
export const EPPO_LPG_PAGE = "https://www.eppo.go.th/energy-price/lpg-retail-price-today/%E0%B8%A3%E0%B8%B2%E0%B8%84%E0%B8%B2%E0%B8%81%E0%B9%8A%E0%B8%B2%E0%B8%8B-lpg/";
export type LpgAi = { price_15kg: number; effective_date: string | null; as_of_date: string | null; price_quote: string; date_quote: string };
const EN_MON: Record<string, string> = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };
/** "1 Mar 2023" → 2023-03-01 (used to cross-check AI dates against the page text). */
export const enDate = (s: string) => { const m = s.match(/(\d{1,2})\s+([A-Z][a-z]{2})\s+(20\d{2})/); return m && EN_MON[m[2]!] ? `${m[3]}-${EN_MON[m[2]!]}-${m[1]!.padStart(2, "0")}` : null; };
const squash = (s: string) => s.replace(/[\s\\|*]+/g, "");

/** AI output is accepted only if its quotes are really on the page and agree with its numbers. */
export function parseLpgAiResult(ai: LpgAi, page: string, today: string) {
  const price = Number(ai.price_15kg);
  if (!Number.isFinite(price) || price < 300 || price > 700) throw new Error(`AI อ่านราคาถัง 15 กก. ได้ ${ai.price_15kg} — นอกช่วง 300–700 บาท ไม่บันทึก`);
  const p = squash(page);
  if (!ai.price_quote || !p.includes(squash(ai.price_quote)) || !ai.price_quote.includes(String(price))) throw new Error("ข้อความราคาที่ AI อ้างไม่พบในหน้า สนพ. — ไม่บันทึก");
  if (ai.effective_date) {
    if (!ai.date_quote || !p.includes(squash(ai.date_quote)) || enDate(ai.date_quote) !== ai.effective_date) throw new Error("วันที่มีผลที่ AI อ้างไม่พบในหน้า สนพ. — ไม่บันทึก");
    if (ai.effective_date > today) throw new Error(`วันที่มีผล ${ai.effective_date} อยู่ในอนาคต`);
  }
  const asOfOk = ai.as_of_date && ai.as_of_date <= today && ai.as_of_date >= shift(today, -3);
  return { price, effective: ai.effective_date, asOf: asOfOk ? ai.as_of_date! : today };
}
const shift = (d: string, n: number) => { const t = new Date(d + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
