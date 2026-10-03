// Client-safe registry of every data source and the metrics it feeds.
// `source` must match the name the server writes into source_runs.

export type SourceInfo = { source: string; agency: string; kind: "api" | "crawler"; metrics: string[] };


export const SOURCES: SourceInfo[] = [
  { source: "สำนักงานสลากกินแบ่งรัฐบาล (GLO)", agency: "สำนักงานสลากกินแบ่งรัฐบาล", kind: "api", metrics: ["lotto"] },
  { source: "CheckRaka (ราคาอาหาร)", agency: "CheckRaka", kind: "crawler", metrics: ["pork", "egg", "chicken", "rice_jasmine", "morning_glory", "palm_oil", "chili", "lime"] },
  { source: "RakaKaset (ราคาเกษตร)", agency: "RakaKaset", kind: "crawler", metrics: ["palm", "rubber", "latex", "rice_farm", "cassava", "corn", "hog_farm"] },
  { source: "Longdo Traffic Index", agency: "Longdo Traffic", kind: "api", metrics: ["traffic_idx"] },
  { source: "สมาคมค้าทองคำ", agency: "สมาคมค้าทองคำ", kind: "api", metrics: ["gold_bar", "gold_orn"] },
  { source: "ThaiWater (สสน.)", agency: "สสน.", kind: "api", metrics: ["cp_dam_q"] },
  { source: "RID อ่างเก็บน้ำ (กรมชลประทาน)", agency: "กรมชลประทาน", kind: "api", metrics: ["dam_pasak_pct", "dam_pasak_out", "dam_khundan_pct"] },
  { source: "กรมอุตุฯ เตือนภัย", agency: "กรมอุตุนิยมวิทยา", kind: "api", metrics: ["tmd_warn"] },
  { source: "กรมอุตุฯ แผ่นดินไหว", agency: "กรมอุตุนิยมวิทยา", kind: "api", metrics: ["quake_th"] },
  { source: "กรมอุตุฯ พยากรณ์ กทม.และปริมณฑล", agency: "กรมอุตุนิยมวิทยา", kind: "api", metrics: ["fc_tmax_bkk", "fc_tmin_bkk"] },
  { source: "Kapook ปฏิทินวันหยุด", agency: "Kapook", kind: "crawler", metrics: [] },
  { source: "กรมสรรพากร (ปฏิทินภาษี)", agency: "กรมสรรพากร", kind: "crawler", metrics: [] },
  { source: "PTT (thai-oil-api)", agency: "ปตท.", kind: "api", metrics: ["gsh95", "e20", "diesel"] },
  { source: "บางจาก (Bangchak API)", agency: "บางจาก", kind: "api", metrics: [] },
  { source: "กรมอุตุฯ ตรวจอากาศ 3 ชม. (กรุงเทพฯ)", agency: "กรมอุตุนิยมวิทยา", kind: "api", metrics: ["tmax_bkk", "rain_bkk"] },
  { source: "GISTDA PM2.5 (กรุงเทพฯ)", agency: "GISTDA", kind: "api", metrics: ["pm25_bkk"] },
  { source: "ExchangeRate (อัตราแลกเปลี่ยน)", agency: "open.er-api.com", kind: "api", metrics: ["usdthb", "eurthb", "jpythb"] },
];

export const isOfficial = (newsSource: string) => newsSource.includes("เว็บไซต์ทางการ");

export type Agency = { key: string; label: string; sources: string[]; newsAgency?: string; category: "government" | "other" };

/** Agencies shown on /agencies, each grouping its sources (by source name). */
export const AGENCIES: Agency[] = [
  { key: "tmd", label: "กรมอุตุนิยมวิทยา", category: "government", sources: ["กรมอุตุฯ เตือนภัย", "กรมอุตุฯ แผ่นดินไหว", "กรมอุตุฯ พยากรณ์ กทม.และปริมณฑล", "กรมอุตุฯ ตรวจอากาศ 3 ชม. (กรุงเทพฯ)"], newsAgency: "กรมอุตุนิยมวิทยา" },
  { key: "water", label: "สสน. / กรมชลประทาน", category: "government", sources: ["ThaiWater (สสน.)", "RID อ่างเก็บน้ำ (กรมชลประทาน)"], newsAgency: "กรมชลประทาน / สทนช." },
  { key: "gistda", label: "GISTDA (PM2.5 กรุงเทพฯ)", category: "government", sources: ["GISTDA PM2.5 (กรุงเทพฯ)"] },
  { key: "rd", label: "กรมสรรพากร", category: "government", sources: ["กรมสรรพากร (ปฏิทินภาษี)"] },
  { key: "glo", label: "สำนักงานสลากกินแบ่งรัฐบาล", category: "government", sources: ["สำนักงานสลากกินแบ่งรัฐบาล (GLO)"] },
  { key: "gold", label: "สมาคมค้าทองคำ", category: "other", sources: ["สมาคมค้าทองคำ"] },
  { key: "energy", label: "ปตท. / บางจาก (ราคาน้ำมัน)", category: "other", sources: ["PTT (thai-oil-api)", "บางจาก (Bangchak API)"] },
  { key: "checkraka", label: "CheckRaka (ราคาอาหาร)", category: "other", sources: ["CheckRaka (ราคาอาหาร)"] },
  { key: "rakakaset", label: "RakaKaset (ราคาเกษตร)", category: "other", sources: ["RakaKaset (ราคาเกษตร)"] },
  { key: "longdo", label: "Longdo Traffic Index", category: "other", sources: ["Longdo Traffic Index"] },
  { key: "exchange", label: "ExchangeRate (อัตราแลกเปลี่ยน)", category: "other", sources: ["ExchangeRate (อัตราแลกเปลี่ยน)"] },
  { key: "kapook", label: "Kapook ปฏิทินวันหยุด", category: "other", sources: ["Kapook ปฏิทินวันหยุด"] },
];

export const agencyMetrics = (a: Agency) => SOURCES.filter((s) => a.sources.includes(s.source)).flatMap((s) => s.metrics);
