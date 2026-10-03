// Server-only: BTS/MRT disruption notices from official X accounts via Firecrawl. Rule-based filter (no AI);
// stored as labelled social_posts (is_bkk = true, area = line); never creates signals.
import { firecrawlMarkdown } from "./http.server";
import { parseXPosts } from "./fm91.server";
import { RAIL_ACCOUNTS, isDisruption } from "./rail";

export const RAIL_SOURCE = "รถไฟฟ้า BTS/MRT (X)";

export async function refreshRail(admin: any) {
  const ran_at = new Date().toISOString();
  const base = { source: RAIL_SOURCE, kind: "crawler", url: RAIL_ACCOUNTS.map((a) => a.url).join(" , "), ran_at };
  const errs: string[] = [];
  let read = 0, kept = 0;
  const notes: string[] = [];
  for (const a of RAIL_ACCOUNTS) {
    try {
      const posts = parseXPosts(await firecrawlMarkdown(a.url, 3000));
      if (!posts.length) throw new Error("ไม่พบโพสต์ที่อ่านได้");
      read += posts.length;
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
  const ok = errs.length < RAIL_ACCOUNTS.length;
  return { ...base, ok, rows: kept, error: errs.length ? errs.join(" · ").slice(0, 300) : null, sample: ok ? `อ่าน ${read} โพสต์ · ประกาศเหตุขัดข้อง ${kept}${notes.length ? ` — ${notes.join(" | ")}` : " (ไม่มีเหตุขัดข้อง)"}` : null };
}
