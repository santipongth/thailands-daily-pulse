// Pure parser for Kapook yearly holiday pages (e.g. https://calendar.kapook.com/2569/holiday).
// Each row: <span class="date">1 มกราคม 2569</span><strong>name</strong><em>bank</em><em>gov</em>
const MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
export const KAPOOK_URL_RE = /^https:\/\/calendar\.kapook\.com\/\d{4}\/holiday\/?$/;

export type KapookHoliday = { holiday_date: string; name: string; kind: string; is_gov: boolean; is_bank: boolean };

const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

export function parseKapook(html: string): KapookHoliday[] {
  const out: KapookHoliday[] = [];
  const re = /<span class="date">([\s\S]*?)<\/span>\s*<strong>([\s\S]*?)<\/strong>\s*<em>([\s\S]*?)<\/em>\s*<em>([\s\S]*?)<\/em>/g;
  for (const m of html.matchAll(re)) {
    const d = strip(m[1]!).match(/^(\d{1,2})\s+(\S+)\s+(\d{4})$/);
    const mi = d ? MONTHS.indexOf(d[2]!) : -1;
    if (!d || mi < 0) continue;
    const y = Number(d[3]) - 543;
    const is_bank = strip(m[3]!).includes("หยุด");
    const is_gov = strip(m[4]!).includes("หยุด");
    if (!is_bank && !is_gov) continue;
    out.push({
      holiday_date: `${y}-${String(mi + 1).padStart(2, "0")}-${d[1]!.padStart(2, "0")}`,
      name: strip(m[2]!).slice(0, 120),
      kind: is_gov && is_bank ? "ราชการและธนาคาร" : is_gov ? "ราชการ" : "ธนาคาร",
      is_gov, is_bank,
    });
  }
  return out;
}
