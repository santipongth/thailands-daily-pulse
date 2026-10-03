#!/usr/bin/env bun
// Checks configuration and database readiness. Prints what is missing; never prints secret values.
import { existsSync, readFileSync } from "node:fs";

export function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const REQUIRED = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "LOVABLE_CRON_SECRET",
];
const OPTIONAL = ["VITE_SITE_URL", "VITE_ADMIN_EMAIL", "LOVABLE_API_KEY", "AI_API_KEY", "FIRECRAWL_API_KEY"];

export function checkEnv(env: Record<string, string | undefined>) {
  const placeholder = (v?: string) => !v || /YOUR-PROJECT|xxx|change-me/.test(v);
  return {
    missing: REQUIRED.filter((k) => placeholder(env[k])),
    optionalMissing: OPTIONAL.filter((k) => !env[k]),
  };
}

async function main() {
  const fileEnv = existsSync(".env") ? parseEnv(readFileSync(".env", "utf8")) : {};
  const env = { ...fileEnv, ...process.env } as Record<string, string | undefined>;
  let ok = true;
  console.log(existsSync(".env") ? "✓ .env found" : "• no .env (using environment only) — run `bun run setup`");
  const { missing, optionalMissing } = checkEnv(env);
  if (missing.length) {
    ok = false;
    console.log("✗ missing required settings:", missing.join(", "));
  } else console.log("✓ required settings present");
  if (optionalMissing.length) console.log("• optional not set (features pause):", optionalMissing.join(", "));

  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (url && key && !missing.includes("VITE_SUPABASE_URL")) {
    for (const table of ["families", "metrics", "source_registry"]) {
      try {
        const r = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${table}?select=*&limit=1`, {
          headers: { apikey: key, Prefer: "count=exact" },
        });
        const count = r.headers.get("content-range")?.split("/")[1];
        if (r.ok && count && count !== "0") console.log(`✓ ${table}: ${count} rows`);
        else {
          ok = false;
          console.log(`✗ ${table}: ${r.ok ? "empty — run `bun run db:setup`" : `HTTP ${r.status} — schema not installed?`}`);
        }
      } catch (e) {
        ok = false;
        console.log(`✗ cannot reach database: ${(e as Error).message}`);
        break;
      }
    }
  }
  console.log(ok ? "\nAll good. Run `bun run dev`." : "\nFix the items above (see docs/development.md).");
  process.exit(ok ? 0 : 1);
}

if (import.meta.main) main();
