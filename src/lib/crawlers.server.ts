// Server-only: crawls official agency websites, stores newly seen announcement links,
// and turns "new announcements today" into an observation per agency.

type Target = { source: string; agency: string; metric: string; url: string; match?: RegExp };

const TARGETS: Target[] = [
  { source: "กรมควบคุมโรค (เว็บไซต์ทางการ)", agency: "กรมควบคุมโรค", metric: "gov_ddc", url: "https://ddc.moph.go.th/", match: /news|pr|brc|viralpneumonia/i },
  { source: "กรมที่ดิน (เว็บไซต์ทางการ)", agency: "กรมที่ดิน", metric: "gov_dol", url: "https://www.dol.go.th/knowledge-land-department/law/announce/land-department-announcement/", match: /announce|news|wp-content\/uploads/i },
  { source: "กรมประมง (เว็บไซต์ทางการ)", agency: "กรมประมง", metric: "gov_fish", url: "https://www.fisheries.go.th/", match: /news|pr|announce/i },
  { source: "กรมการขนส่งทางบก (เว็บไซต์ทางการ)", agency: "กรมการขนส่งทางบก", metric: "gov_dlt", url: "https://www.dlt.go.th/th/", match: /news|public-news|announce/i },
  { source: "กรมปศุสัตว์ (เว็บไซต์ทางการ)", agency: "กรมปศุสัตว์", metric: "gov_dld", url: "https://www.dld.go.th/th/", match: /news|pr|announce|index\.php/i },
];

const BASELINE = "2000-01-01T00:00:00Z"; // first-seen links are stored as baseline, not "new"

function reason(e: unknown): string {
  const m = String((e as Error)?.message ?? e);
  if (/timeout|aborted/i.test(m)) return "เว็บไซต์ไม่ตอบสนองภายใน 15 วินาที (timeout)";
  if (/521|522|523/.test(m)) return `เซิร์ฟเวอร์ต้นทางของหน่วยงานปิดหรือล่ม (${m.match(/52\d/)?.[0]})`;
  if (/403/.test(m)) return "เว็บไซต์ปฏิเสธการเข้าถึงจากระบบอัตโนมัติ (403)";
  if (/404/.test(m)) return "ไม่พบหน้าเว็บ อาจย้ายที่อยู่ (404)";
  if (/BLOCKED/.test(m)) return "ถูกระบบป้องกันบอท (Incapsula/Cloudflare) บล็อก";
  if (/NOLINKS/.test(m)) return "โหลดหน้าได้แต่ไม่พบรายการประกาศ (โครงสร้างหน้าอาจเปลี่ยน)";
  if (/fetch failed|ENOTFOUND|ECONN|network/i.test(m)) return "เชื่อมต่อเว็บไซต์ไม่ได้ (DNS/เครือข่าย)";
  return m.slice(0, 200);
}

function extractLinks(html: string, base: string, match?: RegExp) {
  const host = new URL(base).host;
  const out = new Map<string, string>();
  const re = /<a\b[^>]*href="([^"#]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const text = m[2]!.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
    if (text.length < 20 || text.length > 300) continue;
    let href: string;
    try { href = new URL(m[1]!, base).toString(); } catch { continue; }
    if (new URL(href).host !== host || href === base) continue;
    if (match && !match.test(href)) continue;
    if (!out.has(href)) out.set(href, text);
  }
  return [...out].slice(0, 60).map(([link, title]) => ({ link, title }));
}

export async function runCrawlers(admin: any, date: string) {
  const dayStart = new Date(`${date}T00:00:00+07:00`).toISOString();
  const values: Record<string, number> = {};
  const runs: any[] = [];
  for (const t of TARGETS) {
    const ran_at = new Date().toISOString();
    try {
      const res = await fetch(t.url, { headers: { "user-agent": "Mozilla/5.0 ThailandDailySignals" }, signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      if (/_Incapsula_Resource|cf-chl|challenge-platform/.test(html)) throw new Error("BLOCKED");
      const links = extractLinks(html, t.url, t.match);
      if (!links.length) throw new Error("NOLINKS");
      const { data: seen } = await admin.from("news_items").select("link").eq("source", t.source);
      const known = new Set((seen ?? []).map((r: any) => r.link));
      const first = known.size === 0;
      const fresh = links.filter((l) => !known.has(l.link));
      if (fresh.length) {
        await admin.from("news_items").upsert(
          fresh.map((l) => ({ source: t.source, title: l.title, link: l.link, agency: t.agency, family_id: "gov", published_at: first ? BASELINE : ran_at })),
          { onConflict: "link", ignoreDuplicates: true },
        );
      }
      const { count } = await admin.from("news_items").select("id", { count: "exact", head: true }).eq("source", t.source).gte("published_at", dayStart);
      values[t.metric] = count ?? 0;
      runs.push({ source: t.source, url: t.url, kind: "crawler", ok: true, rows: links.length, error: null, ran_at, last_ok_at: ran_at,
        sample: first ? `เก็บฐานข้อมูลเริ่มต้น ${links.length} รายการ` : `พบ ${links.length} ลิงก์ · ใหม่ ${fresh.length} · เช่น ${links[0]!.title.slice(0, 80)}` });
    } catch (e) {
      runs.push({ source: t.source, url: t.url, kind: "crawler", ok: false, rows: 0, error: reason(e), ran_at });
    }
  }
  return { values, runs };
}
