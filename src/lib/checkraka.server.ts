// Server-only: daily crawler for CheckRaka (checkraka.app/price) — an aggregator of
// Thai food prices from ~9 sources, updated daily at 05:00. Reads the schema.org
// ItemList JSON-LD on each category page (the listed price per product).

export const CHECKRAKA_SOURCE = "CheckRaka (ราคาอาหาร)";

// metric_id -> category page + product slug (or Thai name match for products without a slug match)
const MAP: { metric: string; page: string; slug?: string; name?: string }[] = [
  { metric: "pork", page: "pork", slug: "pork-lean" },
  { metric: "egg", page: "egg", name: "ไข่ไก่ เบอร์ 2" },
  { metric: "chili", page: "chili", slug: "chili-birds-eye" },
  { metric: "lime", page: "lime", slug: "lime" },
  { metric: "chicken", page: "chicken", slug: "chicken-breast" },
  { metric: "rice_jasmine", page: "jasmine-rice", slug: "rice-jasmine" },
  { metric: "morning_glory", page: "morning-glory", slug: "morning-glory" },
  { metric: "palm_oil", page: "cooking-oil", slug: "oil-palm" },
];

type Item = { slug: string; name: string; price: number };

function parseItems(html: string): Item[] {
  const out: Item[] = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const d = JSON.parse(m[1]!);
      if (d["@type"] !== "ItemList") continue;
      for (const e of d.itemListElement ?? []) {
        const price = Number(e?.item?.offers?.price);
        if (!Number.isFinite(price) || price <= 0) continue;
        out.push({ slug: String(e.url ?? "").split("/").filter(Boolean).pop() ?? "", name: String(e.name ?? e.item?.name ?? ""), price });
      }
    } catch { /* skip malformed block */ }
  }
  return out;
}

export async function runCheckRaka(): Promise<{ values: Record<string, number>; run: any }> {
  const ran_at = new Date().toISOString();
  const values: Record<string, number> = {};
  const errors: string[] = [];
  const pages = [...new Set(MAP.map((m) => m.page))];
  for (const page of pages) {
    try {
      const res = await fetch(`https://checkraka.app/price/${page}-today/`, {
        headers: { "User-Agent": "ThailandDailySignals/1.0 (daily price check, 1 request/page/day)" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const items = parseItems(await res.text());
      if (!items.length) throw new Error("ไม่พบรายการราคาในหน้า");
      for (const m of MAP.filter((x) => x.page === page)) {
        const it = items.find((i) => (m.slug ? i.slug === m.slug : i.name === m.name));
        if (it) values[m.metric] = it.price;
        else errors.push(`${page}: ไม่พบ ${m.slug ?? m.name}`);
      }
    } catch (e) {
      errors.push(`${page}: ${(e as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 300)); // be polite
  }
  const rows = Object.keys(values).length;
  const sample = ["pork", "egg", "rice_jasmine"].filter((k) => values[k] != null).map((k) => `${k} ${values[k]}`).join(" · ");
  return {
    values,
    run: {
      source: CHECKRAKA_SOURCE, kind: "crawler", url: "https://checkraka.app/price/", ran_at, rows,
      ok: rows > 0, error: errors.length ? errors.join("; ").slice(0, 300) : null, sample: sample || null,
    },
  };
}
