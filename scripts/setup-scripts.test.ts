import { describe, expect, it } from "vitest";
import { fillEnv, projectRefFromUrl } from "./setup";
import { checkEnv, parseEnv } from "./doctor";

describe("setup helpers", () => {
  it("fills only known keys and keeps comments", () => {
    const out = fillEnv("# c\nA=1\nB=2", { B: "x" });
    expect(out).toBe("# c\nA=1\nB=x");
  });
  it("reads project ref", () => {
    expect(projectRefFromUrl("https://abc123.supabase.co")).toBe("abc123");
    expect(projectRefFromUrl("http://localhost:54321")).toBe("");
  });
});

describe("doctor", () => {
  it("parses env and flags placeholders", () => {
    const env = parseEnv('VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co\nLOVABLE_CRON_SECRET="abc"');
    const r = checkEnv(env);
    expect(r.missing).toContain("VITE_SUPABASE_URL");
    expect(r.missing).not.toContain("LOVABLE_CRON_SECRET");
  });
});
