import { afterEach, describe, expect, it, vi } from "vitest";
import { scrape } from "./fm91.server";

const post = "### 1. Post\nPosted: 2026-10-03T05:00:00Z\nURL: [post](https://x.com/fm91trafficpro/status/12345)\n> กรุงเทพฯ รถติด";
const ok = () => new Response(JSON.stringify({ success: true, data: { markdown: post } }), { status: 200 });
const empty = () => new Response(JSON.stringify({ success: true, data: { markdown: "" } }), { status: 200 });

describe("FM91 Firecrawl transient failures", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); delete process.env.FIRECRAWL_API_KEY; });

  it.each([500, 429])("retries HTTP %i then accepts readable posts", async (status) => {
    process.env.FIRECRAWL_API_KEY = "test-key";
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ error: "temporary" }), { status })).mockResolvedValueOnce(ok());
    vi.stubGlobal("fetch", fetcher);
    expect(await scrape()).toContain("กรุงเทพฯ รถติด");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("retries an empty feed but fails after the last attempt", async () => {
    process.env.FIRECRAWL_API_KEY = "test-key";
    const fetcher = vi.fn().mockResolvedValue(empty());
    vi.stubGlobal("fetch", fetcher);
    await expect(scrape()).rejects.toThrow("ไม่พบโพสต์ที่อ่านได้");
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("does not retry a permanent 403", async () => {
    process.env.FIRECRAWL_API_KEY = "test-key";
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "forbidden" }), { status: 403 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(scrape()).rejects.toThrow("Firecrawl 403");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});