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

export async function politeFetch(url: string, init: RequestInit & { timeoutMs?: number; tries?: number } = {}): Promise<Response> {
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
