// Server-only: one polite, browser-like fetch for every crawler and API connector.
// - Browser header profile (Chrome on Windows, Thai locale) so origins treat us like a normal visitor.
// - 120 s timeout per try (large/slow government files).
// - Retries: 429 (honours Retry-After, capped 20 s), 5xx and timeouts/network errors; max 3 tries.
// Real headless browsers cannot run in the serverless runtime, so this is the stealth layer available here.

const BROWSER_HEADERS: Record<string, string> = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.9,*/*;q=0.8",
  "accept-language": "th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7",
  "cache-control": "no-cache",
  pragma: "no-cache",
  "sec-ch-ua": '"Chromium";v="129", "Not=A?Brand";v="8", "Google Chrome";v="129"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
  "upgrade-insecure-requests": "1",
};

export const FETCH_TIMEOUT_MS = 120_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Per-job request mode set by the queue from admin source_config (null = built-in behaviour: direct).
let reqMode: string | null = null;
let applyToFetch = false;
export function setRequestMode(mode: string | null, fetchToo: boolean) { reqMode = mode; applyToFetch = !!mode && fetchToo; }
export const getRequestMode = () => reqMode;

/** Fetch any URL through Firecrawl (real browser, Thai location); returns the page body as a Response. */
export async function firecrawlFetch(url: string): Promise<Response> {
  const key = process.env["FIRECRAWL_API_KEY"];
  if (!key) throw new Error("ยังไม่ได้เชื่อม Firecrawl");
  const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["rawHtml"], onlyMainContent: false, location: { country: "TH" }, maxAge: 0, timeout: 120000 }),
  });
  const fc: any = await r.json().catch(() => null);
  if (!r.ok || !fc?.success) throw new Error(`Firecrawl ตอบ ${r.status} ${fc?.error ?? ""}`.trim());
  const st = fc.data?.metadata?.statusCode;
  if (st && st !== 200) throw new Error(`${st} — ปลายทางบล็อก Firecrawl ด้วย`);
  const raw: string = fc.data?.rawHtml ?? "";
  const pre = raw.match(/^\s*(?:<html[^>]*>)?\s*(?:<head>.*?<\/head>)?\s*(?:<body[^>]*>)?\s*<pre[^>]*>([\s\S]*)<\/pre>/)?.[1];
  const body = pre ? pre.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&") : raw;
  return new Response(body, { status: 200, headers: { "content-type": fc.data?.metadata?.contentType ?? "text/html" } });
}

/** Page as Markdown via Firecrawl (for sites behind a bot challenge; tables come out as Markdown tables). */
export async function firecrawlMarkdown(url: string, waitFor = 5000): Promise<string> {
  const key = process.env["FIRECRAWL_API_KEY"];
  if (!key) throw new Error("ยังไม่ได้เชื่อม Firecrawl");
  const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: false, location: { country: "TH" }, maxAge: 0, waitFor, timeout: 120000 }),
  });
  const fc: any = await r.json().catch(() => null);
  if (!r.ok || !fc?.success) throw new Error(`Firecrawl ตอบ ${r.status} ${fc?.error ?? ""}`.trim());
  const st = fc.data?.metadata?.statusCode;
  if (st && st !== 200) throw new Error(`${st} — ปลายทางตอบผิดปกติผ่าน Firecrawl`);
  return String(fc.data?.markdown ?? "");
}

export async function politeFetch(url: string, init: RequestInit & { timeoutMs?: number; tries?: number } = {}): Promise<Response> {
  if (applyToFetch && reqMode === "firecrawl") return firecrawlFetch(url);
  if (applyToFetch && reqMode === "auto") {
    try { return await directFetch(url, init); } catch (e) {
      try { return await firecrawlFetch(url); } catch (e2) { throw new Error(`ตรง: ${(e as Error).message} · Firecrawl: ${(e2 as Error).message}`); }
    }
  }
  return directFetch(url, init);
}

async function directFetch(url: string, init: RequestInit & { timeoutMs?: number; tries?: number } = {}): Promise<Response> {
  const { timeoutMs = FETCH_TIMEOUT_MS, tries = 3, headers, ...rest } = init;
  const waits = [5000, 15000];
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { ...rest, headers: { ...BROWSER_HEADERS, ...(headers as Record<string, string> | undefined) }, signal: AbortSignal.timeout(timeoutMs) });
      if (res.ok) return res;
      if ((res.status === 429 || res.status >= 500) && i < tries - 1) {
        const ra = Number(res.headers.get("retry-after"));
        await sleep(Number.isFinite(ra) && ra > 0 ? Math.min(ra * 1000, 20000) : waits[i] ?? 15000);
        lastErr = new Error(`${res.status} ${url}`);
        continue;
      }
      throw new Error(`${res.status} ${url}`);
    } catch (e) {
      const msg = String((e as Error)?.message ?? e);
      if (/^\d{3} /.test(msg) && !/^(429|5\d\d) /.test(msg)) throw e; // 4xx: don't retry
      lastErr = e;
      if (i < tries - 1) { await sleep(waits[i] ?? 15000); continue; }
    }
  }
  const m = String((lastErr as Error)?.message ?? lastErr);
  throw new Error(/abort|timeout/i.test(m) ? `หมดเวลารอ ${timeoutMs / 1000} วินาที (${tries} ครั้ง) ${url}` : m);
}
