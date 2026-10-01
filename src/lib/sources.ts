// Client-safe registry of every data source and the metrics it feeds.
// `source` must match the name the server writes into source_runs.

export type SourceInfo = { source: string; agency: string; kind: "api" | "crawler" | "catalog"; metrics: string[] };

const cat = (agency: string, metric: string): SourceInfo => ({ source: `ข้อมูลเปิดภาครัฐ: ${agency}`, agency, kind: "catalog", metrics: [metric] });

export const SOURCES: SourceInfo[] = [
  cat("กรมปศุสัตว์", "cat_dld"),
  cat("กรมเจ้าท่า", "cat_md"),
  cat("กรุงเทพมหานคร", "cat_bma"),
  cat("อบจ./ท้องถิ่น", "cat_pao"),
  cat("กรมควบคุมโรค", "cat_ddc"),
  cat("กรมการขนส่งทางบก", "cat_dlt"),
  { source: "กรมควบคุมโรค (เว็บไซต์ทางการ)", agency: "กรมควบคุมโรค", kind: "crawler", metrics: ["gov_ddc"] },
  { source: "กรมที่ดิน (เว็บไซต์ทางการ)", agency: "กรมที่ดิน", kind: "crawler", metrics: ["gov_dol"] },
  { source: "กรมประมง (เว็บไซต์ทางการ)", agency: "กรมประมง", kind: "crawler", metrics: ["gov_fish"] },
  { source: "กรมการขนส่งทางบก (เว็บไซต์ทางการ)", agency: "กรมการขนส่งทางบก", kind: "crawler", metrics: ["gov_dlt"] },
  { source: "กรมปศุสัตว์ (เว็บไซต์ทางการ)", agency: "กรมปศุสัตว์", kind: "crawler", metrics: ["gov_dld"] },
  { source: "สำนักงานสลากกินแบ่งรัฐบาล (GLO)", agency: "สำนักงานสลากกินแบ่งรัฐบาล", kind: "api", metrics: ["lotto"] },
  { source: "CheckRaka (ราคาอาหาร)", agency: "CheckRaka", kind: "crawler", metrics: ["pork", "egg", "chicken", "rice_jasmine", "morning_glory", "palm_oil", "chili", "lime"] },
  { source: "RakaKaset (ราคาเกษตร)", agency: "RakaKaset", kind: "crawler", metrics: ["palm", "rubber", "latex", "rice_farm", "cassava", "corn", "hog_farm"] },
  { source: "Longdo Traffic Index", agency: "Longdo Traffic", kind: "api", metrics: ["traffic_idx"] },
  { source: "สมาคมค้าทองคำ", agency: "สมาคมค้าทองคำ", kind: "api", metrics: ["gold_bar", "gold_orn"] },
  { source: "ThaiWater (สสน.)", agency: "สสน. / กรมชลประทาน", kind: "api", metrics: ["dam_total", "dam_bhumibol"] },
  { source: "กรมอุตุฯ เตือนภัย", agency: "กรมอุตุนิยมวิทยา", kind: "api", metrics: ["tmd_warn"] },
  { source: "กรมอุตุฯ แผ่นดินไหว", agency: "กรมอุตุนิยมวิทยา", kind: "api", metrics: ["quake_max"] },
  { source: "PTT (thai-oil-api)", agency: "ปตท.", kind: "api", metrics: ["gsh95", "e20", "diesel"] },
  { source: "บางจาก (Bangchak API)", agency: "บางจาก", kind: "api", metrics: [] },
  { source: "Open-Meteo (อากาศ/PM2.5)", agency: "Open-Meteo", kind: "api", metrics: ["pm25_bkk", "pm25_cnx", "rain_bkk", "tmax_bkk"] },
  { source: "ExchangeRate (อัตราแลกเปลี่ยน)", agency: "open.er-api.com", kind: "api", metrics: ["usdthb", "eurthb", "jpythb"] },
];

export const isOfficial = (newsSource: string) => newsSource.includes("เว็บไซต์ทางการ");

/** Metric id -> catalog agency name (for gov_changes lookups). */
export const CATALOG_METRIC_AGENCY: Record<string, string> = Object.fromEntries(
  SOURCES.filter((x) => x.kind === "catalog").map((x) => [x.metrics[0]!, x.agency]),
);

export type Agency = { key: string; label: string; sources: string[]; catalog?: string; newsAgency?: string };

/** Agencies shown on /agencies, each grouping its sources (by source name). */
export const AGENCIES: Agency[] = [
  { key: "tmd", label: "กรมอุตุนิยมวิทยา", sources: ["กรมอุตุฯ เตือนภัย", "กรมอุตุฯ แผ่นดินไหว"], newsAgency: "กรมอุตุนิยมวิทยา" },
  { key: "water", label: "สสน. / กรมชลประทาน", sources: ["ThaiWater (สสน.)"], newsAgency: "กรมชลประทาน / สทนช." },
  { key: "gold", label: "สมาคมค้าทองคำ", sources: ["สมาคมค้าทองคำ"] },
  { key: "dld", label: "กรมปศุสัตว์", sources: ["กรมปศุสัตว์ (เว็บไซต์ทางการ)", "ข้อมูลเปิดภาครัฐ: กรมปศุสัตว์"], catalog: "กรมปศุสัตว์", newsAgency: "กรมปศุสัตว์" },
  { key: "md", label: "กรมเจ้าท่า", sources: ["ข้อมูลเปิดภาครัฐ: กรมเจ้าท่า"], catalog: "กรมเจ้าท่า" },
  { key: "bma", label: "กรุงเทพมหานคร", sources: ["ข้อมูลเปิดภาครัฐ: กรุงเทพมหานคร"], catalog: "กรุงเทพมหานคร" },
  { key: "pao", label: "อบจ. / ท้องถิ่น", sources: ["ข้อมูลเปิดภาครัฐ: อบจ./ท้องถิ่น"], catalog: "อบจ./ท้องถิ่น" },
  { key: "ddc", label: "กรมควบคุมโรค", sources: ["กรมควบคุมโรค (เว็บไซต์ทางการ)", "ข้อมูลเปิดภาครัฐ: กรมควบคุมโรค"], catalog: "กรมควบคุมโรค", newsAgency: "กรมควบคุมโรค" },
  { key: "dlt", label: "กรมการขนส่งทางบก", sources: ["กรมการขนส่งทางบก (เว็บไซต์ทางการ)", "ข้อมูลเปิดภาครัฐ: กรมการขนส่งทางบก"], catalog: "กรมการขนส่งทางบก", newsAgency: "กรมการขนส่งทางบก" },
  { key: "dol", label: "กรมที่ดิน", sources: ["กรมที่ดิน (เว็บไซต์ทางการ)"], newsAgency: "กรมที่ดิน" },
  { key: "fish", label: "กรมประมง", sources: ["กรมประมง (เว็บไซต์ทางการ)"], newsAgency: "กรมประมง" },
  { key: "glo", label: "สำนักงานสลากกินแบ่งรัฐบาล", sources: ["สำนักงานสลากกินแบ่งรัฐบาล (GLO)"] },
  { key: "energy", label: "ปตท. / บางจาก (ราคาน้ำมัน)", sources: ["PTT (thai-oil-api)", "บางจาก (Bangchak API)"] },
];

export const agencyMetrics = (a: Agency) => SOURCES.filter((s) => a.sources.includes(s.source)).flatMap((s) => s.metrics);
