import { afterEach, describe, expect, it, vi } from "vitest";
import { scrape } from "./fm91.server";

const post = "### 1. Post\nPosted: 2026-10-03T05:00:00Z\nURL: [post](https://x.com/fm91trafficpro/status/12345)\n> กรุงเทพฯ รถติด";
const response = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, headers: new Headers(), json: async () => body });
const ok = () => response(200, { success: true, data: { markdown: post } });
const empty = () => response(200, { success: true, data: { markdown: "" } });

describe("FM91 Firecrawl transient failures", () => {
  afterEach(() => { vi.unstubAllGlobals(); delete process.env["FIRECRAWL_API_KEY"]; });

  it.each([500, 429])("retries HTTP %i then accepts readable posts", async (status: number) => {
    process.env["FIRECRAWL_API_KEY"] = "test-key";
    const fetcher = vi.fn().mockResolvedValueOnce(response(status, { error: "temporary" })).mockResolvedValueOnce(ok());
    vi.stubGlobal("fetch", fetcher);
    expect(await scrape()).toContain("กรุงเทพฯ รถติด");
    expect(fetcher).toHaveBeenCalledTimes(2);
  }, 15_000);

  it("retries an empty feed but fails after the last attempt", async () => {
    process.env["FIRECRAWL_API_KEY"] = "test-key";
    const fetcher = vi.fn().mockResolvedValue(empty());
    vi.stubGlobal("fetch", fetcher);
    await expect(scrape()).rejects.toThrow("ไม่พบโพสต์ที่อ่านได้");
    expect(fetcher).toHaveBeenCalledTimes(3);
  }, 20_000);

  it("does not retry a permanent 403", async () => {
    process.env["FIRECRAWL_API_KEY"] = "test-key";
    const fetcher = vi.fn().mockResolvedValue(response(403, { error: "forbidden" }));
    vi.stubGlobal("fetch", fetcher);
    await expect(scrape()).rejects.toThrow("Firecrawl 403");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});