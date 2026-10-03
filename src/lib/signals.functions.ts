import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const refreshData = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ maxAgeHours: z.number().min(1).max(24).default(3) }).parse(d ?? {}))
  .handler(async ({ data }) => {
    const { refreshIfStale } = await import("./ingest.server");
    try {
      return await refreshIfStale(data.maxAgeHours);
    } catch (e) {
      console.error("refresh failed", e);
      return { refreshed: false };
    }
  });

/** Manual retry from the failures page; at most once per 10 minutes for everyone. */
export const retrySources = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: l } = await supabaseAdmin.from("job_locks").select("locked_until").eq("name", "manual_retry").maybeSingle();
  if (l && new Date(l.locked_until) > new Date()) return { refreshed: false, wait_until: l.locked_until as string };
  await supabaseAdmin.from("job_locks").upsert({ name: "manual_retry", locked_until: new Date(Date.now() + 10 * 60e3).toISOString() });
  const { refreshIfStale } = await import("./ingest.server");
  try { return await refreshIfStale(3, { force: true, runKind: "manual" }); } catch (e) { console.error(e); return { refreshed: false }; }
});

/** Short-lived link to an archived raw evidence file (public data; bucket stays private). */
export const evidenceUrl = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number }) => ({ id: Number(d.id) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("raw_evidence").select("storage_path").eq("id", data.id).maybeSingle();
    if (!row) throw new Error("not found");
    const { data: s, error } = await supabaseAdmin.storage.from("evidence").createSignedUrl(row.storage_path, 600);
    if (error) throw error;
    return { url: s.signedUrl };
  });

/** Line diff of a raw evidence file vs the previous file fetched from the same URL (text files only). */
export const evidenceDiff = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number }) => ({ id: Number(d.id) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cur } = await supabaseAdmin.from("raw_evidence").select("id,url,sha256,storage_path,content_type,fetched_at,bytes").eq("id", data.id).maybeSingle();
    if (!cur) throw new Error("not found");
    const { data: prev } = await supabaseAdmin.from("raw_evidence").select("id,sha256,storage_path,fetched_at,bytes").eq("url", cur.url).lt("fetched_at", cur.fetched_at).neq("sha256", cur.sha256).order("fetched_at", { ascending: false }).limit(1).maybeSingle();
    const { data: same } = await supabaseAdmin.from("raw_evidence").select("fetched_at").eq("url", cur.url).lt("fetched_at", cur.fetched_at).order("fetched_at", { ascending: false }).limit(1).maybeSingle();
    const base = { prev_fetched_at: (prev?.fetched_at ?? same?.fetched_at ?? null) as string | null, prev_bytes: (prev?.bytes ?? null) as number | null };
    if (!prev) return { ...base, status: same ? "same" : "first", lines: [] as { t: "+" | "-"; s: string }[], truncated: false };
    const ct = cur.content_type ?? "";
    if (!/json|html|xml|csv|text|rss/.test(ct)) return { ...base, status: "binary", lines: [], truncated: false };
    const read = async (p: string) => {
      const { data: b } = await supabaseAdmin.storage.from("evidence").download(p);
      const t = b ? await b.text() : "";
      return t.slice(0, 500_000).replace(/></g, ">\n<").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    };
    const [a, b] = await Promise.all([read(prev.storage_path), read(cur.storage_path)]);
    const A = a.slice(0, 2000), B = b.slice(0, 2000);
    // LCS on capped line arrays
    const m = A.length, n = B.length;
    const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
    for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) dp[i]![j] = A[i] === B[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    const lines: { t: "+" | "-"; s: string }[] = [];
    let i = 0, j = 0;
    while (i < m && j < n) {
      if (A[i] === B[j]) { i++; j++; }
      else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) lines.push({ t: "-", s: A[i++]!.slice(0, 300) });
      else lines.push({ t: "+", s: B[j++]!.slice(0, 300) });
    }
    while (i < m) lines.push({ t: "-", s: A[i++]!.slice(0, 300) });
    while (j < n) lines.push({ t: "+", s: B[j++]!.slice(0, 300) });
    return { ...base, status: "changed", lines: lines.slice(0, 200), truncated: lines.length > 200 || a.length > 2000 || b.length > 2000 };
  });

/** TMD daily forecast for Bangkok & vicinity. Order: region RSS (www.tmd.go.th, often blocked by its
 *  incomplete certificate) → data.tmd.go.th 7-day forecast (today's rows for Bangkok + 5 provinces) → last archived RSS. */
export const getBkkForecast = createServerFn({ method: "GET" }).handler(async () => {
  const { TMD_BKK_URL, parseBkkForecast } = await import("./tmd-forecast");
  const { politeFetch } = await import("./http.server");
  let xml = "";
  try { xml = await (await politeFetch(TMD_BKK_URL, { timeoutMs: 15000, tries: 1 })).text(); } catch (e) { console.warn("tmd region forecast failed", (e as Error).message); }
  if (xml.includes("<item>")) return { ...parseBkkForecast(xml), from: "live" as const, sourceUrl: TMD_BKK_URL };
  try {
    const { TMD7D_URL, parseTmd7d } = await import("./tmd7d");
    const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
    const rows = parseTmd7d(await (await politeFetch(TMD7D_URL, { timeoutMs: 60000, tries: 2 })).text(), today);
    const bkk = rows.find((r) => r.province === "กรุงเทพมหานคร");
    if (bkk) {
      const mx = rows.map((r) => r.max).filter((x): x is number => x != null);
      const mn = rows.map((r) => r.min).filter((x): x is number => x != null);
      const rain = bkk.rainPct ?? 0;
      const advice: string[] = [];
      if (rain >= 30 || /ฝน/.test(bkk.descTh)) advice.push("พกร่ม เผื่อเวลาเดินทาง");
      if (/คะนอง/.test(bkk.descTh)) advice.push("ระวังลมกระโชกแรง หลีกเลี่ยงต้นไม้ใหญ่และป้ายโฆษณา");
      if (Math.max(...mx, 0) >= 35) advice.push("อากาศร้อน ดื่มน้ำบ่อย ๆ");
      return {
        title: "พยากรณ์อากาศ 7 วัน (วันนี้)", published: null, validFrom: today, icon: null, conditionEn: "",
        conditionTh: bkk.descTh || "—", rainChanceTh: bkk.rainPct != null ? `ฝนตก ${bkk.rainPct}% ของพื้นที่` : null,
        minRange: mn.length ? [Math.min(...mn), Math.max(...mn)] as [number, number] : null,
        maxRange: mx.length ? [Math.min(...mx), Math.max(...mx)] as [number, number] : null,
        windTh: null,
        provinces: rows.filter((r) => r.max != null && r.min != null).map((r) => ({ name: r.province, max: r.max!, min: r.min! })),
        advice, summary: "", from: "7d" as const, sourceUrl: TMD7D_URL,
      };
    }
  } catch (e) { console.warn("tmd 7-day forecast failed", (e as Error).message); }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin.from("raw_evidence").select("storage_path").ilike("url", "%region-daily-forecast%").order("fetched_at", { ascending: false }).limit(1).maybeSingle();
  if (row) { const { data: b } = await supabaseAdmin.storage.from("evidence").download(row.storage_path); xml = b ? await b.text() : ""; }
  if (!xml.includes("<item>")) return null;
  return { ...parseBkkForecast(xml), from: "archive" as const, sourceUrl: TMD_BKK_URL };
});
