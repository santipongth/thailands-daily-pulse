// Household electricity price (client-safe, pure). Ft is announced by ERC every 4 months and is the same for
// MEA (Bangkok) and PEA; the base residential tariff comes from the official tariff document below.
export const ELEC_SOURCE = "การไฟฟ้า (ค่า Ft / อัตราค่าไฟ)";
export const FT_URL = "https://www.pea.co.th/our-services/tariff/ft";
export const TARIFF_PAGE = "https://www.pea.co.th/our-services/tariff";
/** Official residential tariff 1.1.2 (>150 units/month), Electricity_Tariff_SEP_2026 (PEA, identical rate for MEA). */
export const TARIFF = {
  doc: "Electricity_Tariff_SEP_2026_3.pdf",
  docUrl: "https://www.pea.co.th/sites/default/files/users/user34/attachments/Electricity_Tariff_SEP_2026_3.pdf",
  service: 24.62,
  steps: [ { upTo: 200, rate: 3.0 }, { upTo: 400, rate: 4.1584 }, { upTo: Infinity, rate: 4.3583 } ],
  vat: 0.07,
};
export const HOUSE_UNITS_MONTH = 200; // ≈ 6.5 units/day (user-confirmed household usage)

/** Monthly bill (incl. Ft + VAT) and average baht per unit. */
export function billFor(units: number, ft: number) {
  let energy = 0, prev = 0;
  for (const s of TARIFF.steps) { const n = Math.max(0, Math.min(units, s.upTo) - prev); energy += n * s.rate; prev = s.upTo; if (units <= s.upTo) break; }
  const before = energy + units * ft + TARIFF.service;
  const total = before * (1 + TARIFF.vat);
  return { energy, ftCost: units * ft, service: TARIFF.service, vat: before * TARIFF.vat, total, perUnit: total / units };
}

const TH_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

/** Parse "ค่า Ft ประจำเดือนกันยายน – ธันวาคม 2569 หน่วยละ 0.1623 บาท" from the PEA Ft page. */
export function parseFt(html: string): { ft: number; from: string; to: string; label: string } | null {
  const t = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
  const m = t.match(/ค่า\s*Ft\s*ประจำเดือน\s*(\S+)\s*[–-]\s*(\S+)\s*(\d{4})\s*หน่วยละ\s*(-?\d+(?:\.\d+)?)\s*บาท/);
  if (!m) return null;
  const a = TH_MONTHS.indexOf(m[1]!), b = TH_MONTHS.indexOf(m[2]!), y = Number(m[3]) - 543;
  if (a < 0 || b < 0) return null;
  const ya = b < a ? y - 1 : y;
  const last = new Date(Date.UTC(y, b + 1, 0)).getUTCDate();
  return { ft: Number(m[4]), from: `${ya}-${String(a + 1).padStart(2, "0")}-01`, to: `${y}-${String(b + 1).padStart(2, "0")}-${last}`, label: `${m[1]}–${m[2]} ${m[3]}` };
}

/** Latest tariff PDF linked from the tariff page (to flag a new base tariff for review). */
export function latestTariffDoc(html: string): string | null {
  const docs = [...html.matchAll(/Electricity_Tariff_([A-Z]{3})_(\d{4})[^"']*\.pdf/g)].map((x) => x[0]);
  const mon = "JANFEBMARAPRMAYJUNJULAUGSEPOCTNOVDEC";
  return docs.sort((p, q) => {
    const k = (s: string) => { const r = s.match(/_([A-Z]{3})_(\d{4})/)!; return Number(r[2]) * 12 + mon.indexOf(r[1]!) / 3; };
    return k(q) - k(p);
  })[0] ?? null;
}
