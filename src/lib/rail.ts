// BTS / MRT service notices from the operators' official X accounts (via Firecrawl Markdown).
// Disruption-type posts are kept as labelled context; only delay/suspension notices count toward rail signals.
export const RAIL_ACCOUNTS = [
  { line: "BTS", url: "https://x.com/BTS_SkyTrain" },
  { line: "MRT", url: "https://x.com/BEM_MRT" },
] as const;

export const DISRUPT_RE = /ขัดข้อง|ล่าช้า|หยุดให้บริการ|งดให้บริการ|ปิดให้บริการชั่วคราว|ปิดสถานี|ปิดทางเข้า|เดินรถไม่ได้|เดินรถช้า|ปรับลดความเร็ว|เพิ่มระยะเวลา|ให้บริการไม่เต็ม|ไม่สามารถให้บริการ|delay|disrupt|suspend|technical (issue|problem)/i;

/** Signal rule (user-confirmed): delays & suspensions only — station exits/hours changes are context, not signals. */
export const SERVICE_ALERT_RE = /ขัดข้อง|ล่าช้า|หยุดให้บริการ|งดให้บริการ|ปิดให้บริการชั่วคราว|เดินรถไม่ได้|เดินรถช้า|ปรับลดความเร็ว|ให้บริการไม่เต็ม|ไม่สามารถให้บริการ|delay|suspend|disrupt|technical (issue|problem)/i;

export const isDisruption = (text: string) => DISRUPT_RE.test(text);
export const isServiceAlert = (text: string) => SERVICE_ALERT_RE.test(text);

/** Bangkok calendar date + 3-hour block (0–7) of an ISO timestamp. */
export const bkkDate = (iso: string) => new Date(Date.parse(iso) + 7 * 3600e3).toISOString().slice(0, 10);
export const bkkBlock = (iso: string) => Math.floor(new Date(Date.parse(iso) + 7 * 3600e3).getUTCHours() / 3);
export const BLOCK_TH = ["00–03", "03–06", "06–09", "09–12", "12–15", "15–18", "18–21", "21–24"];
