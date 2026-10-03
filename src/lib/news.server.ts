// Server-only: pulls Thai newspaper RSS feeds and tags items by government agency and signal family.
import { politeFetch } from "./http.server";

const FEEDS = [
  { source: "มติชน", url: "https://www.matichon.co.th/feed" },
  { source: "ประชาชาติธุรกิจ", url: "https://www.prachachat.net/feed" },
  { source: "ข่าวสด", url: "https://www.khaosod.co.th/feed" },
];

/** General-news feeds: every item kept (kind 'general'), tagged with a family when keywords match. Context only. */
export const GENERAL_FEEDS = [
  { source: "Thai PBS", url: "https://news.thaipbs.or.th/rss/news" },
  { source: "ข่าวสด (ข่าวด่วน)", url: "https://www.khaosod.co.th/breaking-news/feed" },
  { source: "ประชาไท", url: "https://www.prachatai.com/rss.xml" },
];
export const GENERAL_SOURCE = "ข่าวทั่วไป RSS";

const AGENCIES: [RegExp, string, string | null][] = [
  [/กรมทางหลวง|ทางด่วน|กทพ\.|มอเตอร์เวย์/, "กรมทางหลวง / กทพ.", "traffic"],
  [/กรมการข้าว|กรมส่งเสริมการเกษตร|กระทรวงเกษตร/, "กระทรวงเกษตรฯ", "farm"],
  [/สนพ\.|กรมธุรกิจพลังงาน|กองทุนน้ำมัน/, "กระทรวงพลังงาน", "oil"],
  [/กรมอุตุ/, "กรมอุตุนิยมวิทยา", "weather"],
  [/กรมชลประทาน|กรมชลฯ|สทนช/, "กรมชลประทาน / สทนช.", "water"],
  [/กรมการค้าภายใน/, "กรมการค้าภายใน", "food"],
  [/กรมควบคุมมลพิษ|คพ\./, "กรมควบคุมมลพิษ", "air"],
];

const FAMILY_WORDS: [RegExp, string][] = [
  [/ราคาน้ำมัน|ดีเซล|แก๊สโซฮอล์|เบนซิน|LPG/i, "oil"],
  [/ราคาทอง|ทองคำ/, "gold"],
  [/ค่าเงินบาท|บาทอ่อน|บาทแข็ง/, "fx"],
  [/PM ?2\.5|ฝุ่น/i, "air"],
  [/น้ำท่วม|เขื่อน|น้ำป่า|ระดับน้ำ/, "water"],
  [/ฝนตก|พายุ|มรสุม/, "weather"],
  [/ราคาหมู|ราคาไข่|ราคาผัก|ค่าครองชีพ|ราคาอาหาร/, "food"],
  [/ราคาข้าว|ยางพารา|ปาล์ม|มันสำปะหลัง|สุกร/, "farm"],
  [/สลากกินแบ่ง|หวย|ลอตเตอรี่/, "lottery"],
  [/รถติด|จราจร/, "traffic"],
];

function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;|&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#8211;/g, "–").replace(/&#8217;/g, "’")
    .trim();
}
const tag = (block: string, name: string) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1] ?? "") : "";
};

export async function collectGeneralNews() {
  const rows: { source: string; title: string; link: string; published_at: string; agency: string | null; family_id: string | null; kind: string }[] = [];
  const errs: string[] = [];
  const results = await Promise.allSettled(GENERAL_FEEDS.map(async (f) => {
    const res = await politeFetch(f.url, { timeoutMs: 30000, tries: 2 });
    if (!res.ok) throw new Error(`${f.source} HTTP ${res.status}`);
    return { f, xml: await res.text() };
  }));
  const per: string[] = [];
  for (const [i, r] of results.entries()) {
    if (r.status !== "fulfilled") { errs.push(String((r.reason as Error)?.message ?? r.reason).slice(0, 100)); continue; }
    let n = 0;
    for (const it of r.value.xml.split(/<item[ >]/).slice(1, 30)) {
      const title = tag(it, "title"); const link = tag(it, "link") || (it.match(/<guid[^>]*>([^<]+)</)?.[1] ?? "");
      const pub = new Date(tag(it, "pubDate"));
      if (!title || !/^https?:/.test(link) || isNaN(pub.getTime())) continue;
      const text = `${title} ${tag(it, "category")}`;
      let agency: string | null = null, family: string | null = null;
      for (const [re, a, fam] of AGENCIES) if (re.test(text)) { agency = a; family = fam; break; }
      if (!family) for (const [re, fam] of FAMILY_WORDS) if (re.test(text)) { family = fam; break; }
      rows.push({ source: r.value.f.source, title, link, published_at: pub.toISOString(), agency, family_id: family, kind: "general" }); n++;
    }
    per.push(`${GENERAL_FEEDS[i]!.source} ${n}`);
  }
  return { rows, errs, per };
}

export async function collectNews() {
  const rows: { source: string; title: string; link: string; published_at: string; agency: string | null; family_id: string | null }[] = [];
  const results = await Promise.allSettled(
    FEEDS.map(async (f) => {
      const res = await politeFetch(f.url, { timeoutMs: 30000, tries: 2 });
      if (!res.ok) throw new Error(`${f.url} ${res.status}`);
      return { f, xml: await res.text() };
    }),
  );
  for (const r of results) {
    if (r.status !== "fulfilled") { console.error(r.reason); continue; }
    const items = r.value.xml.split("<item>").slice(1, 40);
    for (const it of items) {
      const title = tag(it, "title");
      const link = tag(it, "link");
      const pub = new Date(tag(it, "pubDate"));
      if (!title || !link || isNaN(pub.getTime())) continue;
      const text = `${title} ${tag(it, "category")}`;
      let agency: string | null = null;
      let family: string | null = null;
      for (const [re, a, fam] of AGENCIES) if (re.test(text)) { agency = a; family = fam; break; }
      if (!family) for (const [re, fam] of FAMILY_WORDS) if (re.test(text)) { family = fam; break; }
      if (!agency && !family) continue; // only keep items relevant to a signal family or agency
      rows.push({ source: r.value.f.source, title, link, published_at: pub.toISOString(), agency, family_id: family });
    }
  }
  return rows;
}
