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
