// Pure parser for กรมการค้าภายใน (DIT) Bangkok retail price list (pricelist.dit.go.th, daily report).
export const DIT_SOURCE = "กรมการค้าภายใน (ราคาขายปลีก กทม.)";
export const DIT_URL = "https://pricelist.dit.go.th/main_price.php?seltime=day";

/** Comparison-only metrics (no thresholds → never signals). */
export const DIT_ITEMS = [
  { metric: "dit_pork", product: "P11003", label: "หมูเนื้อแดง สะโพก", basket: "pork" },
  { metric: "dit_chicken", product: "P11012", label: "ไก่ เนื้ออก", basket: "chicken" },
  { metric: "dit_egg", product: "P11027", label: "ไข่ไก่ เบอร์ 2", basket: "egg" },
  { metric: "dit_rice", product: "R13001", label: "ข้าวสารหอมมะลิ 100%", basket: "rice_jasmine" },
  { metric: "dit_morning_glory", product: "P13003", label: "ผักบุ้งจีน", basket: "morning_glory" },
  { metric: "dit_palm_oil", product: "P16011", label: "น้ำมันปาล์ม ขวด 1 ลิตร", basket: "palm_oil" },
  { metric: "dit_lime", product: "P13043", label: "มะนาว เบอร์ 1-2", basket: "lime" },
  { metric: "dit_chili", product: "P13087", label: "พริกขี้หนูจินดา", basket: "chili" },
] as const;

export const ditGroup = (p: string) => p.slice(0, 3) + "000";
const TH_MONTH: Record<string, number> = { "ม.ค.": 1, "ก.พ.": 2, "มี.ค.": 3, "เม.ย.": 4, "พ.ค.": 5, "มิ.ย.": 6, "ก.ค.": 7, "ส.ค.": 8, "ก.ย.": 9, "ต.ค.": 10, "พ.ย.": 11, "ธ.ค.": 12 };
/** YYYY-MM-DD → DD/MM/(BE year) as the site's form expects. */
export const ditFormDate = (d: string) => { const [y, m, dd] = d.split("-"); return `${dd}/${m}/${Number(y) + 543}`; };

export type DitRow = { date: string; min: number; max: number; avg: number };
/** Rows "01 ก.ย. 2569 170 - 180 175.00" from the report table, plus the unit (e.g. บาท/กก.). */
export function parseDit(html: string): { unit: string | null; rows: DitRow[] } {
  const t = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
  const unit = t.match(/สินค้า : .*? (บาท\/[^\s]+)/)?.[1] ?? null;
  const rows: DitRow[] = [];
  for (const m of t.matchAll(/(\d{1,2}) (\S+\.) (\d{4}) ([\d.,]+) - ([\d.,]+) ([\d.,]+)/g)) {
    const mon = TH_MONTH[m[2]!]; if (!mon) continue;
    const n = (s: string) => Number(s.replace(/,/g, ""));
    const avg = n(m[6]!); if (!(avg > 0)) continue;
    rows.push({ date: `${Number(m[3]) - 543}-${String(mon).padStart(2, "0")}-${m[1]!.padStart(2, "0")}`, min: n(m[4]!), max: n(m[5]!), avg });
  }
  return { unit, rows };
}
