// Server-only: FM91 Trafficpro posts from X (Facebook is refused by Firecrawl),
// fetched every 30 min, then classified by AI for Bangkok + vicinity relevance.
// Social posts never create or boost signals.
import { withEvidence } from "./evidence.server";

export const FM91_SOURCE = "FM91 Trafficpro (X)";
const FM91_URL = "https://x.com/fm91trafficpro";
const MODEL = "openai/gpt-6-astra";

export type RawPost = { post_id: string; posted_at: string; url: string; text: string };

/** Parses Firecrawl's X profile markdown ("### N. Post / Posted: / URL: / > text"). */
export function parseXPosts(md: string): RawPost[] {
  const out: RawPost[] = [];
  for (const block of md.split(/\n### \d+\. Post\n/).slice(1)) {
    const posted = block.match(/^Posted:\s*(.+)$/m)?.[1];
    const url = block.match(/^URL:\s*\[[^\]]*\]\((https:\/\/x\.com\/[^)]+\/status\/(\d+))\)/m);
    const text = block.split("\n").filter((l) => l.startsWith(">")).map((l) => l.replace(/^>\s?/, "")).join("\n").trim();
    if (!posted || !url || !text) continue;
    const d = new Date(posted);
    if (isNaN(d.getTime())) continue;
    out.push({ post_id: `x:${url[2]}`, posted_at: d.toISOString(), url: url[1]!, text: text.replace(/\\([-.()_*#\[\]!])/g, "$1") });
  }
  return out;
}

async function scrape(): Promise<string> {
  const key = process.env["FIRECRAWL_API_KEY"];
  if (!key) throw new Error("FIRECRAWL_API_KEY ไม่ได้ตั้งค่า");
  const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url: FM91_URL, formats: ["markdown"] }),
  });
  const j: any = await r.json().catch(() => null);
  if (!r.ok || !j?.success) throw new Error(`Firecrawl ${r.status}: ${j?.error ?? "ไม่ทราบสาเหตุ"}`);
  return j.data?.markdown ?? j.markdown ?? "";
}

type Verdict = { id: string; is_bkk: boolean; area: string; summary: string; reason: string };

/** One streamed Responses call for a batch of posts; returns verdicts. Throws with status on failure. */
async function classify(posts: RawPost[]): Promise<Verdict[]> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("LOVABLE_API_KEY ไม่ได้ตั้งค่า");
  const prompt = `คุณคัดกรองโพสต์ของสถานีวิทยุจราจร FM91 ตัดสินว่าแต่ละโพสต์เกี่ยวข้องกับ "กรุงเทพมหานครและปริมณฑล" (กรุงเทพฯ นนทบุรี ปทุมธานี สมุทรปราการ นครปฐม สมุทรสาคร) โดยตรงหรือไม่ เช่น จราจร ถนน อุบัติเหตุ น้ำท่วม การปิดถนน ในพื้นที่นี้ ข่าวกีฬา ข่าวทั่วประเทศ หรือจังหวัดอื่น = false
ตอบเป็น JSON อย่างเดียว: {"items":[{"id":"...","is_bkk":true|false,"area":"ชื่อถนน/เขต/จังหวัด หรือ ''","summary":"สรุปภาษาไทยไม่เกิน 1 ประโยค ห้ามใส่ตัวเลขที่ไม่มีในโพสต์","reason":"เหตุผลสั้น ๆ"}]}
โพสต์:
${posts.map((p) => `id=${p.post_id}\n${p.text}`).join("\n---\n")}`;
  const r = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key, Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({ model: MODEL, input: prompt, stream: true, store: false, reasoning: { effort: "low" } }),
  });
  if (!r.ok || !r.body) throw Object.assign(new Error(`AI ${r.status}: ${(await r.text()).slice(0, 300)}`), { status: r.status });
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "", text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const l of lines) {
      if (!l.startsWith("data:")) continue;
      const d = l.slice(5).trim();
      if (!d || d === "[DONE]") continue;
      try {
        const ev = JSON.parse(d);
        if (ev.type === "response.output_text.delta") text += ev.delta;
        if (ev.type === "response.refusal.delta" || ev.type === "error") throw new Error(`AI ปฏิเสธ/ผิดพลาด: ${JSON.stringify(ev).slice(0, 200)}`);
      } catch (e) { if (e instanceof Error && e.message.startsWith("AI")) throw e; }
    }
  }
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("AI ไม่ได้ตอบเป็น JSON");
  return (JSON.parse(m[0]).items ?? []) as Verdict[];
}

/** Rejects AI summaries that introduce numbers not present in the post. */
function safeSummary(summary: string, text: string) {
  const nums = summary.match(/\d+(?:[.,]\d+)?/g) ?? [];
  return nums.every((n) => text.includes(n)) ? summary : null;
}

export async function refreshSocial(): Promise<{ fetched: number; added: number; skipped?: string }> {
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  const { data: lock } = await admin.from("job_locks").select("locked_until").eq("name", "social_run").maybeSingle();
  if (lock && new Date(lock.locked_until) > new Date()) return { fetched: 0, added: 0, skipped: "running" };
  const { data: pause } = await admin.from("app_settings").select("value").eq("key", "social_ai_paused").maybeSingle();
  await admin.from("job_locks").upsert({ name: "social_run", locked_until: new Date(Date.now() + 10 * 60e3).toISOString() });
  const ranAt = new Date().toISOString();
  const { data: job } = await admin.from("ingest_jobs").insert({ batch_id: crypto.randomUUID(), source: FM91_SOURCE, job_type: "social", run_kind: "social", status: "running", started_at: ranAt }).select("id").single();
  let fetched = 0, added = 0, error: string | null = null;
  try {
    const md = await withEvidence(admin, job!.id, FM91_SOURCE, scrape);
    const posts = parseXPosts(md);
    fetched = posts.length;
    if (!posts.length) throw new Error("ไม่พบโพสต์ในหน้า X ของ FM91");
    const { data: ev } = await admin.from("raw_evidence").select("id").eq("job_id", job!.id).order("id", { ascending: false }).limit(1).maybeSingle();
    const { data: known } = await admin.from("social_posts").select("post_id").in("post_id", posts.map((p) => p.post_id));
    const seen = new Set((known ?? []).map((k) => k.post_id));
    const fresh = posts.filter((p) => !seen.has(p.post_id)).slice(0, 10);
    if (fresh.length) {
      let verdicts: Verdict[] = [];
      if (pause?.value) {
        error = `AI หยุดชั่วคราว: ${pause.value}`;
      } else {
        try { verdicts = await classify(fresh); }
        catch (e: any) {
          error = e.message;
          if (e.status === 402 || e.status === 403) await admin.from("app_settings").upsert({ key: "social_ai_paused", value: e.message.slice(0, 300) });
        }
      }
      if (verdicts.length || !error) {
        const byId = new Map(verdicts.map((v) => [v.id, v]));
        const rows = fresh.filter((p) => byId.has(p.post_id)).map((p) => {
          const v = byId.get(p.post_id)!;
          return { ...p, source: FM91_SOURCE, is_bkk: !!v.is_bkk, area: v.area || null, summary: safeSummary(v.summary ?? "", p.text), ai_reason: v.reason ?? null, evidence_id: ev?.id ?? null };
        });
        if (rows.length) await admin.from("social_posts").upsert(rows, { onConflict: "post_id" });
        added = rows.length;
      }
    }
  } catch (e: any) {
    error = e.message;
  }
  const ok = !error;
  await admin.from("ingest_jobs").update({ status: ok ? "done" : "failed", rows: added, error, finished_at: new Date().toISOString(), attempts: 1 }).eq("id", job!.id);
  await admin.from("source_runs").upsert({ source: FM91_SOURCE, ran_at: ranAt, ok, rows: added, error, url: FM91_URL, kind: "api", run_kind: "social", ...(ok ? { last_ok_at: ranAt } : {}) });
  await admin.from("source_run_history").insert({ source: FM91_SOURCE, ran_at: ranAt, ok, rows: added, error, run_kind: "social" });
  await admin.from("job_locks").upsert({ name: "social_run", locked_until: new Date().toISOString() });
  return { fetched, added, ...(error ? { skipped: error } : {}) };
}
