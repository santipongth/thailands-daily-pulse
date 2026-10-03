/** Do not mistake a page refresh for a new price or a new wage announcement. */
export const LPG_URL = "https://www.eppo.go.th/wp-json/oil-api/v1/lpg-prices";
export const WAGE_URL = "https://www.mol.go.th/minimum-wage";

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
  if (/Incapsula|incident_id|Access Denied/i.test(page)) throw new Error("เว็บไซต์กระทรวงแรงงานปิดกั้นการเข้าถึง");
  const plain = page.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
  const match = plain.match(/(?:กรุงเทพมหานคร|กรุงเทพฯ).{0,120}?(?:วันละ|อัตรา(?:ค่าจ้าง)?(?:ขั้นต่ำ)?).{0,40}?(\d{3,4})\s*บาท/);
  const date = plain.match(/(?:มีผล(?:บังคับ)?ใช้|ตั้งแต่วันที่)\s*(\d{1,2})\s*(มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\s*(25\d{2}|20\d{2})/);
  if (!match || !date) throw new Error("ไม่พบค่าแรงกรุงเทพฯ และวันมีผลบังคับใช้ในประกาศเดียวกัน");
  const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const iso = `${Number(date[3]) > 2400 ? Number(date[3]) - 543 : date[3]}-${String(months.indexOf(date[2]) + 1).padStart(2, "0")}-${String(date[1]).padStart(2, "0")}`;
  const price = Number(match[1]);
  if (iso > today || price < 300 || price > 1500) throw new Error("ข้อมูลค่าแรงหรือวันมีผลไม่สมเหตุสมผล");
  return { price, date: iso };
}