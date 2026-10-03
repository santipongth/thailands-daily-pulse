// Server-only: captures every outbound fetch made while a job runs and stores the
// original response bytes in the private "evidence" bucket, indexed in raw_evidence.
// Files are kept forever; identical bytes (same sha256) are stored once and referenced again.

type Captured = { url: string; status: number; contentType: string | null; body: Uint8Array<ArrayBuffer>; fetchedAt: string };

const SKIP = /supabase\.co|ai\.gateway\.lovable\.dev|connector-gateway\.lovable\.dev/;
const MAX_BYTES = 15 * 1024 * 1024;

let current: Captured[] | null = null;
let installed = false;

function install() {
  if (installed) return;
  installed = true;
  const orig = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await orig(input as any, init);
    const sink = current;
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (sink && !SKIP.test(url)) {
      try {
        const buf = new Uint8Array(await res.clone().arrayBuffer());
        if (buf.byteLength <= MAX_BYTES) sink.push({ url, status: res.status, contentType: res.headers.get("content-type"), body: buf, fetchedAt: new Date().toISOString() });
      } catch { /* evidence is best-effort; never break the fetch */ }
    }
    return res;
  }) as typeof fetch;
}

async function sha256(b: Uint8Array<ArrayBuffer>) {
  const h = await crypto.subtle.digest("SHA-256", b);
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

const ext = (ct: string | null) =>
  !ct ? "bin" : ct.includes("json") ? "json" : ct.includes("html") ? "html" : ct.includes("xml") || ct.includes("rss") ? "xml" : ct.includes("csv") ? "csv" : ct.includes("pdf") ? "pdf" : ct.includes("text") ? "txt" : "bin";

/** Runs fn while recording its outbound fetches, then persists them as evidence for jobId. Jobs run one at a time. */
export async function withEvidence<T>(admin: any, jobId: number, source: string, fn: () => Promise<T>): Promise<T> {
  install();
  const sink: Captured[] = [];
  current = sink;
  try {
    return await fn();
  } finally {
    current = null;
    await persist(admin, jobId, source, sink).catch((e) => console.error("evidence persist failed", e));
  }
}

async function persist(admin: any, jobId: number, source: string, items: Captured[]) {
  for (let i = 0; i < items.length; i += 5) {
    const rows = await Promise.all(items.slice(i, i + 5).map(async (c) => {
      const hash = await sha256(c.body);
      const url = c.url.slice(0, 1000);
      // Same URL, same bytes as its latest record → just mark it seen again (no new row, no new file).
      const { data: last } = await admin.from("raw_evidence").select("id,sha256,seen_count").eq("url", url).order("fetched_at", { ascending: false }).limit(1).maybeSingle();
      if (last && last.sha256 === hash) {
        await admin.from("raw_evidence").update({ last_seen_at: c.fetchedAt, seen_count: (last.seen_count ?? 1) + 1, last_job_id: jobId }).eq("id", last.id);
        return null;
      }
      const { data: prev } = await admin.from("raw_evidence").select("storage_path").eq("sha256", hash).limit(1).maybeSingle();
      let path = prev?.storage_path as string | undefined;
      if (!path) {
        path = `${c.fetchedAt.slice(0, 10)}/${hash.slice(0, 2)}/${hash}.${ext(c.contentType)}`;
        const { error } = await admin.storage.from("evidence").upload(path, c.body, { contentType: c.contentType ?? "application/octet-stream", upsert: true });
        if (error) { console.error("evidence upload", error.message); return null; }
      }
      return { job_id: jobId, source, url: c.url.slice(0, 1000), http_status: c.status, content_type: c.contentType, bytes: c.body.byteLength, sha256: hash, storage_path: path, fetched_at: c.fetchedAt };
    }));
    const ok = rows.filter(Boolean);
    if (ok.length) await admin.from("raw_evidence").insert(ok);
  }
}
