// Server-only: pulls live sources, writes observations, runs the signal detector,
// and refreshes the AI daily brief when the day's signal set changes.

export function bangkokDate(offsetDays = 0) {
  return new Date(Date.now() + 7 * 3600e3 + offsetDays * 86400e3).toISOString().slice(0, 10);
}

const STALE_MS = 3 * 3600e3;
const LOCK = "ingest";

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

const SEV_TH: Record<string, string> = { high: "สูง", medium: "กลาง", low: "ต่ำ" };
const SEV_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

/** Builds the 4-answer brief from real signals only. publish=true stamps it as the 06:00 edition. */
export async function refreshBrief(admin: any, date: string, publish = false) {
  const { householdImpact, officialAdvice } = await import("./impact");
  const { data: sigs } = await admin
    .from("signals")
    .select("metric_id, family_id, severity, title, prev_value, new_value, change_abs, change_pct, is_demo, checks, score, families(name_th, emoji, source_name, source_url)")
    .eq("signal_date", date)
    .eq("is_demo", false);
  const list = (sigs ?? []).sort((x: any, y: any) => Number(y.score ?? 0) - Number(x.score ?? 0) || (SEV_ORDER[x.severity] ?? 3) - (SEV_ORDER[y.severity] ?? 3));
  const signature = list.map((s: any) => `${s.metric_id}:${s.title}`).sort().join("|");
  const { data: existing } = await admin.from("daily_briefs").select("signature, published_at").eq("brief_date", date).maybeSingle();
  if (existing && existing.signature === signature && (!publish || existing.published_at)) return;
  if (existing?.published_at && !publish) return; // the 06:00 edition is frozen for the day

  const items = list.map((s: any) => {
    const why = s.checks?.rule === "delta" && s.checks?.z != null
      ? `เปลี่ยนแรงกว่าความผันผวนปกติ ${Number(s.checks.z).toFixed(1)} เท่า`
      : s.checks?.rule === "level" ? "ข้ามระดับเกณฑ์ที่กำหนด" : s.checks?.rule === "release" ? "ตัวเลขรอบใหม่ประกาศวันนี้" : s.checks?.rule === "catalog" ? "ชุดข้อมูลทางการเปลี่ยนจริง" : "เกินเกณฑ์ที่กำหนด";
    return {
      metric_id: s.metric_id,
      family: `${s.families?.emoji ?? ""} ${s.families?.name_th ?? ""}`.trim(),
      what: s.title,
      importance: SEV_TH[s.severity] ?? s.severity,
      why,
      impact: householdImpact(s),
      advice: officialAdvice(s),
      source: s.families?.source_name ?? null,
      source_url: s.families?.source_url ?? null,
    };
  });

  let body = items.length ? items.slice(0, 4).map((i: any) => i.what).join(" · ") : "วันนี้ยังไม่มีการเปลี่ยนแปลงอย่างมีนัยสำคัญจากข้อมูลจริง";
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (apiKey && items.length) {
    const facts = items.map((i: any) => `- [${i.importance}] ${i.what}${i.impact ? ` | ผลต่อครัวเรือน: ${i.impact}` : ""}`).join("\n");
    const prompt = `คุณเป็นบรรณาธิการ "Thailand Daily Signals" เขียนบทนำ Daily Brief เช้านี้
ข้อเท็จจริงที่คำนวณแล้ว (ข้อมูลจริงจากแหล่งทางการ):
${facts}

เขียนภาษาไทย 2-4 ประโยค สั้น เป็นภาษาคน เรื่องที่กระทบชีวิตประจำวันมากสุดก่อน
ใช้เฉพาะตัวเลขที่ให้ไว้ ห้ามเพิ่มตัวเลขหรือข้อมูลใหม่ ไม่ใส่หัวข้อ ไม่ใช้ bullet ไม่เกิน 450 ตัวอักษร`;
    try {
      const t = await streamBrief(prompt, apiKey);
      // LLM only phrases: any number not present in the computed facts rejects the text.
      const { numbersInText } = await import("./impact");
      const allowed = new Set(numbersInText(facts));
      const bad = numbersInText(t).filter((n) => !allowed.has(n));
      if (t && !bad.length) body = t;
      else if (bad.length) console.warn("brief rejected, unknown numbers", bad);
    } catch (e) {
      console.error("brief failed", e);
    }
  }
  await admin.from("daily_briefs").upsert({
    brief_date: date, body, signature, items, generated_at: new Date().toISOString(),
    ...(publish ? { published_at: new Date().toISOString() } : {}),
  });
}

export async function refreshIfStale(maxAgeHours = 3, opts: { force?: boolean; publish?: boolean; runKind?: "hourly" | "daily" | "manual" } = {}): Promise<{ refreshed: boolean }> {
  const STALE = Math.min(24, Math.max(1, maxAgeHours)) * 3600e3;
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
  const liveStale = !!opts.force || !last || Date.now() - new Date(last.created_at).getTime() >= STALE;
  const newsStale = !!opts.force || !lastNews || Date.now() - new Date(lastNews.locked_until).getTime() >= STALE_MS;
  if (!liveStale && !newsStale) {
    const { count: due } = await admin.from("ingest_jobs").select("id", { count: "exact", head: true }).eq("status", "queued").lte("run_after", new Date().toISOString());
    if (due) { opts = { ...opts }; }
    const { data: b } = await admin.from("daily_briefs").select("brief_date").eq("brief_date", date).maybeSingle();
    if (b && !due) return { refreshed: false };
  }
  // single-flight lease
  const now = new Date();
  const { data: lock } = await admin.from("job_locks").select("locked_until").eq("name", LOCK).maybeSingle();
  if (lock && new Date(lock.locked_until) > now) return { refreshed: false };
  await admin.from("job_locks").upsert({ name: LOCK, locked_until: new Date(now.getTime() + 5 * 60e3).toISOString() });
  try {
    const { enqueue, drain } = await import("./queue.server");
    const specs: { job_type: string; source: string }[] = [];
    if (liveStale) {
      const { CONNECTORS } = await import("./connectors.server");
      for (const c of CONNECTORS) specs.push({ job_type: "connector", source: c.source });
      specs.push({ job_type: "crawlers", source: "เว็บไซต์หน่วยงานรัฐ (crawler)" });
      // Food/farm prices change once a day: fetch on daily/manual runs or if today's prices are missing.
      const { count: foodToday } = await admin.from("observations").select("id", { count: "exact", head: true })
        .eq("observed_on", date).eq("is_demo", false).in("metric_id", ["pork", "egg"]);
      if (opts.runKind === "daily" || opts.runKind === "manual" || !foodToday) {
        specs.push({ job_type: "checkraka", source: "CheckRaka (ราคาอาหาร)" });
        specs.push({ job_type: "rakakaset", source: "RakaKaset (ราคาเกษตร)" });
      }
      specs.push({ job_type: "catalog", source: "ข้อมูลเปิดภาครัฐ (gdcatalog)" });
      specs.push({ job_type: "lottery", source: "สำนักงานสลากกินแบ่งรัฐบาล (GLO)" });
    }
    if (newsStale) specs.push({ job_type: "news", source: "ข่าว RSS" });
    if (specs.length) await enqueue(admin, specs, opts.runKind ?? "hourly");
    const processed = await drain(admin, date);
    await admin.from("source_run_history").delete().lt("ran_at", new Date(Date.now() - 30 * 86400e3).toISOString());
    if (processed) {
      await admin.rpc("detect_signals", { _d: date });
      await admin.rpc("rank_signals", { _d: date });
    }
    await refreshBrief(admin, date, !!opts.publish);
    return { refreshed: true };
  } finally {
    await admin.from("job_locks").upsert({ name: LOCK, locked_until: new Date(0).toISOString() });
  }
}
