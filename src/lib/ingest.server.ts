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

/** Per-source completeness from the registry (ok / stale / unverifiable) — reported, never read as "no change". */
export async function completenessNow(admin: any, today: string) {
  const { computeCompleteness } = await import("./completeness");
  const [{ data: reg }, { data: runs }, { data: obs }, { data: ev }] = await Promise.all([
    admin.from("source_registry").select("*").order("sort"),
    admin.from("source_runs").select("source,ok,ran_at,last_ok_at,error"),
    admin.from("observations").select("metric_id,observed_on").eq("is_demo", false).gte("observed_on", bangkokDate(-120)).order("observed_on", { ascending: false }).limit(5000),
    admin.from("raw_evidence").select("source,fetched_at").order("fetched_at", { ascending: false }).limit(500),
  ]);
  const latest: Record<string, string> = {};
  for (const o of obs ?? []) latest[o.metric_id] ??= o.observed_on;
  const lastEv: Record<string, string> = {};
  for (const e of ev ?? []) lastEv[e.source] ??= e.fetched_at;
  return computeCompleteness(today, reg ?? [], runs ?? [], latest, lastEv);
}

/**
 * Builds the 4-answer brief from real signals only.
 * step "freeze" (05:45) records the data cutoff; "publish" (05:55) stamps the edition.
 * After publication the edition is frozen; new/changed/withdrawn events become timestamped updates.
 */
export async function refreshBrief(admin: any, date: string, publish = false, step?: "freeze" | "publish") {
  if (step === "publish") publish = true;
  const { householdImpact, officialAdvice, impactFor } = await import("./impact");
  const { data: existing } = await admin.from("daily_briefs").select("signature, published_at, cutoff_at, items").eq("brief_date", date).maybeSingle();

  if (existing?.published_at && !publish) {
    await recordBriefUpdates(admin, date, existing);
    return;
  }
  const { data: sigs } = await admin
    .from("signals")
    .select("metric_id, family_id, signal_date, severity, title, prev_value, new_value, change_abs, change_pct, is_demo, checks, score, families(name_th, emoji, source_name, source_url)")
    .eq("signal_date", date)
    .eq("is_demo", false);
  // Data window: previous day 05:45 → this day 05:45 Bangkok. Only values received inside it count for the edition.
  const windowTo = `${date}T05:45:00+07:00`;
  const prevDay = new Date(Date.parse(`${date}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
  const windowFrom = `${prevDay}T05:45:00+07:00`;
  const enforce = !!step || publish;
  const { data: recv } = await admin.from("observations").select("metric_id, received_at").eq("observed_on", date).eq("is_demo", false);
  const recvOf = new Map((recv ?? []).map((o: any) => [o.metric_id, o.received_at as string]));
  const excluded: { metric_id: string; title: string; received_at: string | null; reason: string }[] = [];
  const all = (sigs ?? []).filter((s: any) => {
    if (!enforce) return true;
    const r = recvOf.get(s.metric_id) ?? null;
    if (r && Date.parse(r) > Date.parse(windowTo)) { excluded.push({ metric_id: s.metric_id, title: s.title, received_at: r, reason: "ได้รับหลัง 05:45 — ไปอยู่ในอัปเดตหลังเผยแพร่" }); return false; }
    return true;
  });
  const list = all.sort((x: any, y: any) => Number(y.score ?? 0) - Number(x.score ?? 0) || (SEV_ORDER[x.severity] ?? 3) - (SEV_ORDER[y.severity] ?? 3));
  const signature = list.map((s: any) => `${s.metric_id}:${s.title}`).sort().join("|");
  const completeness = await completenessNow(admin, date);
  const cutoff = existing?.cutoff_at ?? (step ? windowTo : null);
  const data_window = { from: windowFrom, to: windowTo, received_inside: (recv ?? []).filter((o: any) => Date.parse(o.received_at) <= Date.parse(windowTo)).length, included: list.length, excluded, unverifiable: completeness.filter((c) => c.status !== "ok").map((c: any) => c.source) };
  if (existing && existing.signature === signature && !step && !publish) return;

  const eventIds = list.map((s: any) => `${s.metric_id}:${s.signal_date}`);
  const { data: evs } = eventIds.length ? await admin.from("signal_events").select("event_id,current_version").in("event_id", eventIds) : { data: [] };
  const verOf = new Map((evs ?? []).map((e: any) => [e.event_id, e.current_version]));
  const { data: vers } = eventIds.length ? await admin.from("signal_versions").select("event_id,version,evidence_ids,quality").in("event_id", eventIds) : { data: [] };

  const items = list.map((s: any) => {
    const event_id = `${s.metric_id}:${s.signal_date}`;
    const version = verOf.get(event_id) ?? 1;
    const v = (vers ?? []).find((x: any) => x.event_id === event_id && x.version === version);
    const why = s.checks?.rule === "delta" && s.checks?.z != null
      ? `เปลี่ยนแรงกว่าความผันผวนปกติ ${Number(s.checks.z).toFixed(1)} เท่า`
      : s.checks?.rule === "level" ? "ข้ามระดับเกณฑ์ที่กำหนด" : s.checks?.rule === "release" ? "ตัวเลขรอบใหม่ประกาศวันนี้" : s.checks?.rule === "catalog" ? "ชุดข้อมูลทางการเปลี่ยนจริง" : "เกินเกณฑ์ที่กำหนด";
    const impact = householdImpact(s);
    const advice = officialAdvice(s);
    return {
      metric_id: s.metric_id, event_id, version,
      family: `${s.families?.emoji ?? ""} ${s.families?.name_th ?? ""}`.trim(),
      what: s.title,
      importance: SEV_TH[s.severity] ?? s.severity,
      why, impact, advice, impact_calc: impactFor(s),
      source: s.families?.source_name ?? null,
      source_url: s.families?.source_url ?? null,
      data_date: s.signal_date, compared_with: s.checks?.compared_with ?? null,
      score: s.checks?.score ?? null, rule: s.checks?.rule ?? null,
      evidence_ids: v?.evidence_ids ?? [], quality: v?.quality ?? "cannot_verify",
      impact_inputs: { metric_id: s.metric_id, family_id: s.family_id, prev_value: s.prev_value, new_value: s.new_value, change_abs: s.change_abs, change_pct: s.change_pct },
    };
  });
  // Store the impact formula inputs + advice on each event's current version (recomputable later).
  for (const i of items) {
    await admin.from("signal_versions").update({ impact: { text: i.impact, inputs: i.impact_inputs, calc: i.impact_calc }, advice: i.advice?.text ?? null }).eq("event_id", i.event_id).eq("version", i.version);
  }

  const missing = completeness.filter((c) => c.status !== "ok");
  let body = items.length ? items.slice(0, 4).map((i: any) => i.what).join(" · ") : "วันนี้ยังไม่มีการเปลี่ยนแปลงอย่างมีนัยสำคัญจากข้อมูลจริง";
  if (!items.length && missing.length) body += ` — มี ${missing.length} แหล่งที่ข้อมูลเก่าหรือตรวจสอบไม่ได้ จึงยังสรุปไม่ได้ว่าไม่เปลี่ยน`;
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
    brief_date: date, body, signature, items, generated_at: new Date().toISOString(), completeness, ...(enforce ? { data_window } : {}),
    ...(cutoff ? { cutoff_at: cutoff } : {}),
    ...(publish ? { published_at: new Date().toISOString(), cutoff_at: cutoff ?? new Date().toISOString() } : {}),
  });
}

/** After 06:00: one timestamped update per new event version not already in the edition or earlier updates. */
async function recordBriefUpdates(admin: any, date: string, brief: { published_at: string; items: any[] | null }) {
  const { data: evs } = await admin.from("signal_events").select("event_id,current_version,is_demo").eq("signal_date", date).eq("is_demo", false);
  if (!evs?.length) return;
  const inEdition = new Set((brief.items ?? []).map((i: any) => `${i.event_id}#${i.version}`));
  const { data: ups } = await admin.from("brief_updates").select("event_id,version").eq("brief_date", date);
  const done = new Set((ups ?? []).map((u: any) => `${u.event_id}#${u.version}`));
  const todo = evs.filter((e: any) => !inEdition.has(`${e.event_id}#${e.current_version}`) && !done.has(`${e.event_id}#${e.current_version}`));
  if (!todo.length) return;
  const { data: vers } = await admin.from("signal_versions").select("event_id,version,change_kind,title,reason").in("event_id", todo.map((e: any) => e.event_id));
  const rows = todo.map((e: any) => {
    const v = (vers ?? []).find((x: any) => x.event_id === e.event_id && x.version === e.current_version);
    const kind = v?.change_kind === "new" ? "update" : v?.change_kind === "withdrawn" ? "withdrawal" : "correction";
    return { brief_date: date, kind, title: v?.title ?? e.event_id, body: v?.reason ?? null, event_id: e.event_id, version: e.current_version };
  });
  await admin.from("brief_updates").insert(rows);
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
      // Values may refer to yesterday (e.g. farm prices published late) — detect on their own date.
      await admin.rpc("detect_signals", { _d: bangkokDate(-1) });
      await admin.rpc("detect_signals", { _d: date });
      await admin.rpc("rank_signals", { _d: date });
    }
    await refreshBrief(admin, date, !!opts.publish);
    return { refreshed: true };
  } finally {
    await admin.from("job_locks").upsert({ name: LOCK, locked_until: new Date(0).toISOString() });
  }
}
