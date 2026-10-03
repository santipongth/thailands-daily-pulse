// Server-only: BTS/MRT disruption notices from official X accounts via Firecrawl. Rule-based filter (no AI);
// stored as labelled social_posts (is_bkk = true, area = line). Today's delay/suspension count per line feeds
// metrics rail_bts / rail_mrt (kind 'events') — the only way rail notices become signals.
import { firecrawlMarkdown } from "./http.server";
import { parseXPosts } from "./fm91.server";
import { RAIL_ACCOUNTS, isDisruption, isServiceAlert, bkkDate } from "./rail";

export const RAIL_SOURCE = "รถไฟฟ้า BTS/MRT (X)";

export async function refreshRail(admin: any) {
  const ran_at = new Date().toISOString();
  const base = { source: RAIL_SOURCE, kind: "crawler", url: RAIL_ACCOUNTS.map((a) => a.url).join(" , "), ran_at };
  const errs: string[] = [];
  let read = 0, kept = 0;
  const notes: string[] = [];
  const okLines: string[] = [];
  for (const a of RAIL_ACCOUNTS) {
    try {
      const posts = parseXPosts(await firecrawlMarkdown(a.url, 3000));
      if (!posts.length) throw new Error("ไม่พบโพสต์ที่อ่านได้");
      read += posts.length;
      okLines.push(a.line);
      const hits = posts.filter((p) => isDisruption(p.text) && Date.now() - Date.parse(p.posted_at) < 3 * 86400e3);
      if (hits.length) {
        const { error } = await admin.from("social_posts").upsert(hits.map((p) => ({
          post_id: p.post_id, source: `${a.line} (X)`, posted_at: p.posted_at, text: p.text, url: p.url,
          received_at: ran_at, is_bkk: true, area: `รถไฟฟ้า ${a.line}`, summary: null, ai_reason: "กฎคำสำคัญ: ประกาศเหตุขัดข้อง/ล่าช้า",
        })), { onConflict: "post_id", ignoreDuplicates: true });
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
    const { data } = await admin.from("social_posts").select("source,text,posted_at").in("source", okLines.map((l) => `${l} (X)`))
      .gte("posted_at", new Date(Date.parse(today + "T00:00:00+07:00")).toISOString());
    for (const l of okLines) {
      const id = `rail_${l.toLowerCase()}`;
      values[id] = (data ?? []).filter((p: any) => p.source === `${l} (X)` && bkkDate(p.posted_at) === today && isServiceAlert(p.text)).length;
      dates[id] = today;
    }
  }
  const ok = errs.length < RAIL_ACCOUNTS.length;
  const counts = Object.entries(values).map(([k, v]) => `${k.slice(5).toUpperCase()} ${v}`).join(" · ");
  return {
    values, dates,
    run: { ...base, ok, rows: kept, error: errs.length ? errs.join(" · ").slice(0, 300) : null, sample: ok ? `อ่าน ${read} โพสต์ · ประกาศเหตุขัดข้อง ${kept}${notes.length ? ` — ${notes.join(" | ")}` : " (ไม่มีเหตุขัดข้อง)"} · ล่าช้า/หยุดวันนี้: ${counts}` : null },
  };
}
