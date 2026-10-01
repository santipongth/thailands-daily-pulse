// Server-only: daily crawler for RakaKaset (rakakaset.com/prices) — farm-gate prices
// republished from the Office of Agricultural Economics. Parses the price table rows.

export const RAKAKASET_SOURCE = "RakaKaset (ราคาเกษตร)";

// metric_id -> exact product label in the table
const MAP: Record<string, string> = {
  palm: "ผลปาล์มน้ำมันทั้งทะลาย",
  rubber: "ยางแผ่นดิบชั้น 3",
  latex: "น้ำยางสด",
  rice_farm: "ข้าวเปลือกเจ้าหอมมะลิ 105",
  cassava: "หัวมันสำปะหลังสดคละ",
  corn: "ข้าวโพดเลี้ยงสัตว์",
  hog_farm: "สุกรพันธุ์ผสม",
};

const TH_MONTH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
function thDate(s: string): string | null {
  const m = s.match(/(\d{1,2}) (\S+) (\d{4})/);
  if (!m) return null;
  const mi = TH_MONTH.indexOf(m[2]!);
  if (mi < 0) return null;
  return `${Number(m[3]) - 543}-${String(mi + 1).padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
}

/** Returns latest prices whose table date is not later than `today` (YYYY-MM-DD, Bangkok). */
export async function runRakaKaset(today: string): Promise<{ values: Record<string, number>; run: any }> {
  const ran_at = new Date().toISOString();
  const values: Record<string, number> = {};
  const errors: string[] = [];
  try {
    const res = await fetch("https://rakakaset.com/prices/", {
      headers: { "User-Agent": "ThailandDailySignals/1.0 (daily price check, 1 request/day)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const cells = (await res.text()).replace(/<[^>]+>/g, "|").split("|").map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean);
    for (const [metric, label] of Object.entries(MAP)) {
      const i = cells.findIndex((c, j) => c.startsWith(label) && /^[\d,]+(\.\d+)?$/.test(cells[j + 1] ?? ""));
      if (i < 0) { errors.push(`ไม่พบ ${label}`); continue; }
      const price = Number(cells[i + 1]?.replace(/,/g, ""));
      const date = cells.slice(i + 2, i + 7).map(thDate).find(Boolean) ?? null;
      if (!Number.isFinite(price) || price <= 0) { errors.push(`${label}: ราคาอ่านไม่ได้`); continue; }
      if (date && date > today) { errors.push(`${label}: วันที่ข้อมูล ${date} อยู่ในอนาคต — ข้าม`); continue; }
      values[metric] = price;
    }
  } catch (e) {
    errors.push((e as Error).message);
  }
  const rows = Object.keys(values).length;
  return {
    values,
    run: {
      source: RAKAKASET_SOURCE, kind: "crawler", url: "https://rakakaset.com/prices/", ran_at, rows,
      ok: rows > 0, error: errors.length ? errors.join("; ").slice(0, 300) : null,
      sample: ["rubber", "rice_farm", "hog_farm"].filter((k) => values[k] != null).map((k) => `${k} ${values[k]}`).join(" · ") || null,
    },
  };
}
