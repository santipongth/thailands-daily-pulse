// Pure parser: TMD region-daily-forecast RSS (regionid=7 = กรุงเทพฯและปริมณฑล) → plain-Thai summary.
export const TMD_BKK_URL = "https://www.tmd.go.th/api/xml/region-daily-forecast?regionid=7";

export type BkkForecast = {
  title: string;
  published: string | null;
  validFrom: string | null;
  icon: string | null;
  conditionEn: string;
  conditionTh: string;
  rainChanceTh: string | null;
  minRange: [number, number] | null;
  maxRange: [number, number] | null;
  windTh: string | null;
  provinces: { name: string; max: number; min: number }[];
  advice: string[];
  summary: string;
};

const DIR: Record<string, string> = {
  northerly: "ทิศเหนือ", southerly: "ทิศใต้", easterly: "ทิศตะวันออก", westerly: "ทิศตะวันตก",
  northeasterly: "ทิศตะวันออกเฉียงเหนือ", northwesterly: "ทิศตะวันตกเฉียงเหนือ",
  southeasterly: "ทิศตะวันออกเฉียงใต้", southwesterly: "ทิศตะวันตกเฉียงใต้", variable: "ทิศแปรปรวน",
};
const COVER: [RegExp, string, string][] = [
  [/isolated/i, "บางแห่ง", "ราว 10–20% ของพื้นที่"],
  [/scattered/i, "กระจาย", "ราว 30–40% ของพื้นที่"],
  [/fairly widespread/i, "ค่อนข้างมาก", "ราว 40–60% ของพื้นที่"],
  [/widespread/i, "เกือบทั่วไป", "มากกว่า 60% ของพื้นที่"],
];

const range = (s: string, label: string): [number, number] | null => {
  const m = s.match(new RegExp(`${label} temperature\\s*(\\d+)\\s*[-–]\\s*(\\d+)`, "i"));
  return m ? [Number(m[1]), Number(m[2])] : null;
};

function conditionTh(en: string) {
  const parts: string[] = [];
  const cover = COVER.find(([re]) => re.test(en));
  if (/thunder/i.test(en)) parts.push(`ฝนฟ้าคะนอง${cover ? cover[1] : ""}`);
  else if (/heavy rain/i.test(en)) parts.push("ฝนตกหนัก");
  else if (/rain|shower/i.test(en)) parts.push(`ฝนตก${cover ? cover[1] : ""}`);
  else if (/haze/i.test(en)) parts.push("มีหมอกควัน");
  else if (/fog|mist/i.test(en)) parts.push("มีหมอกตอนเช้า");
  else if (/partly cloudy/i.test(en)) parts.push("มีเมฆบางส่วน");
  else if (/cloudy/i.test(en)) parts.push("มีเมฆมาก");
  else if (/clear|fair/i.test(en)) parts.push("ท้องฟ้าโปร่ง");
  if (/heavy/i.test(en) && /thunder/i.test(en)) parts.push("บางแห่งตกหนัก");
  if (/gust/i.test(en)) parts.push("มีลมกระโชกแรง");
  if (/hot/i.test(en)) parts.push("อากาศร้อน");
  return { th: parts.join(" ") || en, chance: cover ? cover[2] : null };
}

export function parseBkkForecast(xml: string): BkkForecast {
  const item = xml.split("<item>")[1] ?? "";
  const title = item.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() ?? "";
  const pub = item.match(/<pubDate>([^<]*)<\/pubDate>/)?.[1]?.trim() ?? null;
  const raw = item.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)?.[1] ?? "";
  const icon = raw.match(/icon-forecast\/(\d+)\.svg/)?.[1] ?? null;
  const plain = raw.replace(/<img[^>]*>/gi, "\n").replace(/<\s*\/?\s*br\s*\/?\s*>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&deg;/g, "°");
  const lines = plain.split("\n").map((l) => l.trim()).filter(Boolean);
  const validFrom = lines[0]?.match(/วันที่\s*(\d{2}\/\d{2}\/\d{4}).*?(\d{1,2}:\d{2})/)?.slice(1).join(" ") ?? null;
  const conditionEn = lines.find((l) => /^[A-Za-z]/.test(l) && !/temperature|winds?/i.test(l)) ?? "";
  const en = lines.join(" ");
  const minRange = range(en, "Minimum");
  const maxRange = range(en, "Maximum");
  const w = en.match(/(\w+)\s+winds?\s*(\d+)\s*[-–]\s*(\d+)\s*km/i);
  const windTh = w ? `ลม${DIR[w[1]!.toLowerCase()] ?? w[1]} ${w[2]}–${w[3]} กม./ชม.` : null;
  const provinces: BkkForecast["provinces"] = [];
  for (const m of plain.matchAll(/([\u0E00-\u0E7F]+)\s*สูงสุด\s*(\d+)\s*ต่ำสุด\s*(\d+)/g)) {
    provinces.push({ name: m[1]!, max: Number(m[2]), min: Number(m[3]) });
  }
  const c = conditionTh(conditionEn);
  const advice: string[] = [];
  if (/thunder|rain|shower/i.test(conditionEn)) advice.push("พกร่ม เผื่อเวลาเดินทาง");
  if (/gust/i.test(conditionEn)) advice.push("ระวังลมแรง หลีกเลี่ยงต้นไม้ใหญ่และป้ายโฆษณา");
  if ((maxRange?.[1] ?? 0) >= 35) advice.push("อากาศร้อน ดื่มน้ำบ่อย ๆ");
  const summary = [
    `กทม.และปริมณฑล: ${c.th}${c.chance ? ` (${c.chance})` : ""}`,
    maxRange ? `ร้อนสุด ${maxRange[0]}–${maxRange[1]}°C` : null,
    minRange ? `เย็นสุด ${minRange[0]}–${minRange[1]}°C` : null,
    windTh,
  ].filter(Boolean).join(" · ");
  return { title, published: pub, validFrom, icon, conditionEn, conditionTh: c.th, rainChanceTh: c.chance, minRange, maxRange, windTh, provinces, advice, summary };
}
