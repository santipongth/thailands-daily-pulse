// BTS / MRT service notices from the operators' official X accounts (via Firecrawl Markdown).
// Only disruption-type posts are kept; they are labelled context and never create signals.
export const RAIL_ACCOUNTS = [
  { line: "BTS", url: "https://x.com/BTS_SkyTrain" },
  { line: "MRT", url: "https://x.com/BEM_MRT" },
] as const;

export const DISRUPT_RE = /ขัดข้อง|ล่าช้า|หยุดให้บริการ|งดให้บริการ|ปิดให้บริการชั่วคราว|ปิดสถานี|ปิดทางเข้า|เดินรถไม่ได้|เดินรถช้า|ปรับลดความเร็ว|เพิ่มระยะเวลา|ให้บริการไม่เต็ม|ไม่สามารถให้บริการ|delay|disrupt|suspend|technical (issue|problem)/i;

export const isDisruption = (text: string) => DISRUPT_RE.test(text);
