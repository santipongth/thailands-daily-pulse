// Server-only: pulls Thai newspaper RSS feeds and tags items by government agency and signal family.

const FEEDS = [
  { source: "มติชน", url: "https://www.matichon.co.th/feed" },
  { source: "ประชาชาติธุรกิจ", url: "https://www.prachachat.net/feed" },
  { source: "ข่าวสด", url: "https://www.khaosod.co.th/feed" },
];

const AGENCIES: [RegExp, string, string | null][] = [
  [/กรมการขนส่ง|ขบ\.|ใบขับขี่|ทะเบียนรถ|ภาษีรถ/, "กรมการขนส่งทางบก", "traffic"],
  [/กรมปศุสัตว์|ปศุสัตว์|อหิวาต์แอฟริกาในสุกร|ASF|ไข้หวัดนก|ลัมปีสกิน/, "กรมปศุสัตว์", "farm"],
  [/กรมทางหลวง|ทางด่วน|กทพ\.|มอเตอร์เวย์/, "กรมทางหลวง / กทพ.", "traffic"],
  [/กรมการข้าว|กรมส่งเสริมการเกษตร|กระทรวงเกษตร/, "กระทรวงเกษตรฯ", "farm"],
  [/สนพ\.|กรมธุรกิจพลังงาน|กองทุนน้ำมัน/, "กระทรวงพลังงาน", "oil"],
  [/กรมควบคุมโรค|คร\.|ไข้เลือดออก|ไข้หวัดใหญ่|โรคระบาด/, "กรมควบคุมโรค", "disease"],
  [/กรมที่ดิน|โฉนด|ภาษีที่ดิน|ค่าธรรมเนียมโอน/, "กรมที่ดิน", null],
  [/กรมประมง|ประมง|สัตว์น้ำ|ปลาหมอคางดำ/, "กรมประมง", "farm"],
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
  [/เงินเฟ้อ|GDP|จีดีพี|ว่างงาน/i, "macro"],
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

export async function collectNews() {
  const rows: { source: string; title: string; link: string; published_at: string; agency: string | null; family_id: string | null }[] = [];
  const results = await Promise.allSettled(
    FEEDS.map(async (f) => {
      const res = await fetch(f.url, { headers: { "user-agent": "Mozilla/5.0 ThailandDailySignals" } });
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
