// Server-only: BTS/MRT disruption notices from official X accounts via Firecrawl. Rule-based filter (no AI);
// stored as labelled social_posts (is_bkk = true, area = line). Today's delay/suspension count per line feeds
// metrics rail_bts / rail_mrt (kind 'events') — the only way rail notices become signals.
import { firecrawlMarkdown } from "./http.server";
import { parseXPosts } from "./fm91.server";
import { RAIL_ACCOUNTS, isDisruption, bkkDate, classifyRail, incidentPosts } from "./rail";

export const RAIL_SOURCE = "รถไฟฟ้า BTS/MRT (X)";

export async function refreshRail(admin: any) {
  const ran_at = new Date().toISOString();
  const base = { source: RAIL_SOURCE, kind: "crawler", url: RAIL_ACCOUNTS.map((a) => a.url).join(" , "), ran_at };
  const errs: string[] = [];
  let read = 0, kept = 0;
  const notes: string[] = [];
  const okLines: string[] = [];
  // Retain the real check gap for the audit reason; late notices still count on arrival.
  const { data: prev } = await admin.from("source_run_history").select("ran_at").eq("source", RAIL_SOURCE).eq("ok", true).order("ran_at", { ascending: false }).limit(1);
  const gapMs = Math.min(6 * 3600e3, Math.max(3600e3, prev?.[0] ? Date.parse(ran_at) - Date.parse(prev[0].ran_at) : 3 * 3600e3));
  for (const a of RAIL_ACCOUNTS) {
    try {
      const posts = parseXPosts(await firecrawlMarkdown(a.url, 3000));
      if (!posts.length) throw new Error("ไม่พบโพสต์ที่อ่านได้");
      read += posts.length;
      okLines.push(a.line);
      const hits = posts.filter((p) => isDisruption(p.text));
      if (hits.length) {
        const { error } = await admin.from("social_posts").upsert(hits.map((p) => { const c = classifyRail(p.text, p.posted_at, ran_at, gapMs); return {
          rail_status: c.status, rail_reason: c.reason, rail_day: c.day, post_id: p.post_id, source: `${a.line} (X)`, posted_at: p.posted_at, text: p.text, url: p.url,
          received_at: ran_at, is_bkk: true, area: `รถไฟฟ้า ${a.line}`, summary: null, ai_reason: "กฎคำสำคัญ: ประกาศเหตุขัดข้อง/ล่าช้า",
        }; }), { onConflict: "post_id", ignoreDuplicates: true });
        if (error) throw new Error(error.message);
        kept += hits.length;
        notes.push(`${a.line}: ${hits[0]!.text.slice(0, 60)}`);
      }
    } catch (e) {
      errs.push(`${a.line}: ${(e as Error).message}`);
    }
  }
  // Today's (Bangkok) delay/suspension notices per line — only for lines read successfully this round.
  const today = bkkDate(ran_at);
  const values: Record<string, number> = {}; const dates: Record<string, string> = {};
  if (okLines.length) {
    const { data } = await admin.from("social_posts").select("source,posted_at").in("source", okLines.map((l) => `${l} (X)`))
      .eq("rail_day", today).eq("rail_status", "counted");
    const incidents = incidentPosts(data ?? []);
    for (const l of okLines) {
      const id = `rail_${l.toLowerCase()}`;
      values[id] = incidents.filter((p: any) => p.source === `${l} (X)`).length;
      dates[id] = today;
    }
  }
  const ok = errs.length < RAIL_ACCOUNTS.length;
  const counts = Object.entries(values).map(([k, v]) => `${k.slice(5).toUpperCase()} ${v}`).join(" · ");
  return {
    values, dates,
    run: { ...base, ok, rows: kept, error: errs.length ? errs.join(" · ").slice(0, 300) : null, sample: ok ? `อ่าน ${read} โพสต์ · ประกาศเหตุขัดข้อง ${kept}${notes.length ? ` — ${notes.join(" | ")}` : " (ไม่มีเหตุขัดข้อง)"} · ล่าช้า/หยุดวันนี้: ${counts} · ช่วงห่างรอบตรวจ ${Math.round(gapMs / 60000)} นาที` : null },
  };
}
