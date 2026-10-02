// Pure parser for the Revenue Department tax calendar page (https://www.rd.go.th/62348.html).
export const RD_TAX_URL = "https://www.rd.go.th/62348.html";
const MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

export type TaxDeadline = { due_date: string; channel: string; items: string[] };

const decode = (s: string) => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

/** today = Bangkok YYYY-MM-DD; the page omits the year, so it is inferred (months far behind roll to next year). */
export function parseRdTax(html: string, today: string): TaxDeadline[] {
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "");
  const lines = decode(body.replace(/<[^>]+>/g, "\n")).split("\n").map((l) => l.replace(/^[•·\s]+/, "").trim()).filter(Boolean);
  const [ty, tm] = today.split("-").map(Number) as [number, number];
  const out: TaxDeadline[] = [];
  for (let i = 0; i < lines.length - 2; i++) {
    const day = lines[i]!.match(/^(\d{1,2})$/)?.[1];
    const mi = MONTHS.indexOf(lines[i + 1]!);
    if (!day || mi < 0 || !lines[i + 2]!.startsWith("กำหนด")) continue;
    const channel = lines[i + 2]!;
    const items: string[] = [];
    let j = i + 3;
    while (j < lines.length && !/^\d{1,2}$/.test(lines[j]!) && !lines[j]!.startsWith("←")) items.push(lines[j++]!);
    let y = ty;
    if (mi + 1 < tm - 6) y++;
    else if (mi + 1 > tm + 6) y--;
    const due_date = `${y}-${String(mi + 1).padStart(2, "0")}-${day.padStart(2, "0")}`;
    if (items.length) out.push({ due_date, channel, items });
    i = j - 1;
  }
  return out;
}
