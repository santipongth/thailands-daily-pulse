// Server-only: pulls live sources, writes observations, runs the signal detector,
// and refreshes the AI daily brief when the day's signal set changes.

export function bangkokDate(offsetDays = 0) {
  return new Date(Date.now() + 7 * 3600e3 + offsetDays * 86400e3).toISOString().slice(0, 10);
}

const STALE_MS = 3 * 3600e3;
const LOCK = "ingest";

async function getJson(url: string) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json() as Promise<any>;
}

async function collectLive(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  const [oil, fx, gold, aqB, aqC, wx] = await Promise.allSettled([
    getJson("https://api.chnwt.dev/thai-oil-api/latest"),
    getJson("https://open.er-api.com/v6/latest/USD"),
    getJson("https://api.gold-api.com/price/XAU"),
    getJson("https://air-quality-api.open-meteo.com/v1/air-quality?latitude=13.75&longitude=100.5&current=pm2_5"),
    getJson("https://air-quality-api.open-meteo.com/v1/air-quality?latitude=18.79&longitude=98.98&current=pm2_5"),
    getJson(
      "https://api.open-meteo.com/v1/forecast?latitude=13.75&longitude=100.5&daily=precipitation_sum,temperature_2m_max&timezone=Asia/Bangkok&forecast_days=2",
    ),
  ]);
  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const set = (k: string, v: number | undefined) => {
    if (v !== undefined) out[k] = v;
  };
  if (oil.status === "fulfilled") {
    const p = oil.value?.response?.stations?.ptt;
    set("gsh95", num(p?.gasohol_95?.price));
    set("e20", num(p?.gasohol_e20?.price));
    set("diesel", num(p?.diesel?.price));
  }
  let usd: number | undefined;
  if (fx.status === "fulfilled") {
    const r = fx.value?.rates ?? {};
    usd = num(r.THB);
    if (usd) {
      set("usdthb", +usd.toFixed(3));
      if (num(r.EUR)) set("eurthb", +(usd / r.EUR).toFixed(3));
      if (num(r.JPY)) set("jpythb", +((100 * usd) / r.JPY).toFixed(3));
    }
  }
  if (gold.status === "fulfilled" && usd) {
    const oz = num(gold.value?.price);
    // 1 baht-weight = 15.244 g, Thai bar purity 96.5%
    if (oz) set("gold_bar", Math.round(((oz * usd) / 31.1035) * 15.244 * 0.965 / 50) * 50);
  }
  if (aqB.status === "fulfilled") set("pm25_bkk", num(aqB.value?.current?.pm2_5));
  if (aqC.status === "fulfilled") set("pm25_cnx", num(aqC.value?.current?.pm2_5));
  if (wx.status === "fulfilled") {
    const d = wx.value?.daily;
    const rain = Number(d?.precipitation_sum?.[1]);
    if (Number.isFinite(rain)) out['rain_bkk'] = rain;
    set("tmax_bkk", num(d?.temperature_2m_max?.[0]));
  }
  return out;
}

async function streamBrief(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      input: prompt,
      stream: true,
      store: false,
      reasoning: { effort: "low", summary: "auto" },
      include: ["reasoning.encrypted_content"],
    }),
  });
  if (!res.ok || !res.body) throw new Error(`AI ${res.status}: ${await res.text()}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const frame = buf.slice(0, i);
      buf = buf.slice(i + 2);
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta") text += ev.delta;
          if (ev.type === "response.refusal.delta" || ev.type === "error") throw new Error("AI refused or failed");
        } catch (e) {
          if (e instanceof Error && e.message.startsWith("AI")) throw e;
        }
      }
    }
  }
  return text.trim();
}

export async function refreshBrief(admin: any, date: string) {
  const { data: sigs } = await admin
    .from("signals")
    .select("metric_id, severity, title, change_pct, is_demo, families(name_th)")
    .eq("signal_date", date)
    .order("severity");
  const signature = (sigs ?? []).map((s: any) => `${s.metric_id}:${s.title}`).sort().join("|");
  const { data: existing } = await admin.from("daily_briefs").select("signature").eq("brief_date", date).maybeSingle();
  if (existing && existing.signature === signature) return;
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return;
  const lines = (sigs ?? [])
    .map((s: any) => `- [${s.severity}] ${s.families?.name_th}: ${s.title}${s.change_pct != null ? ` (${Number(s.change_pct).toFixed(1)}%)` : ""}`)
    .join("\n");
  const prompt = `คุณเป็นบรรณาธิการ "Thailand Daily Signals" ตอบคำถาม "วันนี้มีอะไรเปลี่ยนไปในประเทศไทยที่อาจกระทบชีวิตฉัน?"
สัญญาณที่ตรวจพบวันนี้:
${lines || "- ไม่มี"}

เขียนสรุปภาษาไทย 3-5 ประโยค สั้น กระชับ เป็นภาษาคน เรียงเรื่องที่กระทบชีวิตประจำวันมากสุดก่อน
ถ้ามีราคาน้ำมันเปลี่ยน ให้ประมาณผลต่อครัวเรือนที่ใช้น้ำมัน 40 ลิตร/เดือน ถ้ามีราคาอาหารเปลี่ยนให้บอกเป็นเปอร์เซ็นต์
ห้ามแต่งตัวเลขที่ไม่มีในรายการ ไม่ต้องใส่หัวข้อ ไม่ใช้ bullet ไม่เกิน 600 ตัวอักษร`;
  try {
    const body = await streamBrief(prompt, apiKey);
    if (body) await admin.from("daily_briefs").upsert({ brief_date: date, body, signature, generated_at: new Date().toISOString() });
  } catch (e) {
    console.error("brief failed", e);
  }
}

export async function refreshIfStale(): Promise<{ refreshed: boolean }> {
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  const date = bangkokDate();
  const { data: last } = await admin
    .from("observations")
    .select("created_at")
    .eq("is_demo", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: lastNews } = await admin.from("job_locks").select("locked_until").eq("name", "news_fetched").maybeSingle();
  const liveStale = !last || Date.now() - new Date(last.created_at).getTime() >= STALE_MS;
  const newsStale = !lastNews || Date.now() - new Date(lastNews.locked_until).getTime() >= STALE_MS;
  if (!liveStale && !newsStale) {
    const { data: b } = await admin.from("daily_briefs").select("brief_date").eq("brief_date", date).maybeSingle();
    if (b) return { refreshed: false };
  }
  // single-flight lease
  const now = new Date();
  const { data: lock } = await admin.from("job_locks").select("locked_until").eq("name", LOCK).maybeSingle();
  if (lock && new Date(lock.locked_until) > now) return { refreshed: false };
  await admin.from("job_locks").upsert({ name: LOCK, locked_until: new Date(now.getTime() + 5 * 60e3).toISOString() });
  try {
    if (liveStale) {
      const { runConnectors } = await import("./connectors.server");
      const { values: live, runs } = await runConnectors(date);
      await admin.from("source_runs").upsert(runs, { onConflict: "source" });
      const rows = Object.entries(live).map(([metric_id, value]) => ({
        metric_id,
        value,
        observed_on: date,
        is_demo: false,
        created_at: new Date().toISOString(),
      }));
      if (rows.length) {
        const { error } = await admin.from("observations").upsert(rows, { onConflict: "metric_id,observed_on" });
        if (error) console.error(error);
      }
      await admin.rpc("detect_signals", { _d: date });
    }
    if (newsStale) {
      try {
        const { collectNews } = await import("./news.server");
        const news = await collectNews();
        if (news.length) {
          const { error } = await admin.from("news_items").upsert(news, { onConflict: "link", ignoreDuplicates: true });
          if (error) console.error(error);
        }
        // records last news fetch time
        await admin.from("job_locks").upsert({ name: "news_fetched", locked_until: new Date().toISOString() });
      } catch (e) {
        console.error("news failed", e);
      }
    }
    await refreshBrief(admin, date);
    return { refreshed: true };
  } finally {
    await admin.from("job_locks").upsert({ name: LOCK, locked_until: new Date(0).toISOString() });
  }
}
