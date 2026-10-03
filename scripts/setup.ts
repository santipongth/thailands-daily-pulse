#!/usr/bin/env bun
// Interactive first-time setup: writes .env from .env.example and optionally installs the database.
// Values can be pre-supplied as environment variables (non-interactive / CI).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";

export function fillEnv(template: string, values: Record<string, string>): string {
  return template
    .split(/\r?\n/)
    .map((line) => {
      const m = line.match(/^([A-Z0-9_]+)=/);
      return m && values[m[1]] !== undefined ? `${m[1]}=${values[m[1]]}` : line;
    })
    .join("\n");
}

export function projectRefFromUrl(url: string): string {
  return url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? "";
}

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = async (name: string, q: string, def = "") =>
    process.env[name] ?? ((await rl.question(`${q}${def ? ` [${def}]` : ""}: `)).trim() || def);

  for (const tool of ["bun", "psql"]) {
    const ok = spawnSync(tool, ["--version"]).status === 0;
    console.log(ok ? `✓ ${tool}` : `• ${tool} not found${tool === "psql" ? " (needed only for database install)" : ""}`);
  }
  if (existsSync(".env") && (await ask("OVERWRITE_ENV", "`.env` exists. Overwrite? (y/N)", "N")).toLowerCase() !== "y") {
    console.log("Keeping existing .env.");
  } else {
    const url = await ask("SUPABASE_URL", "Database project URL (https://xxxx.supabase.co)");
    const pub = await ask("SUPABASE_PUBLISHABLE_KEY", "Publishable / anon key");
    const svc = await ask("SUPABASE_SERVICE_ROLE_KEY", "Service role / secret key (server only)");
    const site = await ask("SITE_URL", "Public site URL", "http://localhost:8080");
    const admin = await ask("ADMIN_EMAIL", "Admin email", "admin@example.org");
    const cron = process.env.CRON_SECRET ?? randomBytes(32).toString("hex");
    const env = fillEnv(readFileSync(".env.example", "utf8"), {
      VITE_SUPABASE_URL: url,
      VITE_SUPABASE_PUBLISHABLE_KEY: pub,
      VITE_SUPABASE_PROJECT_ID: projectRefFromUrl(url),
      SUPABASE_URL: url,
      SUPABASE_PUBLISHABLE_KEY: pub,
      SUPABASE_SERVICE_ROLE_KEY: svc,
      LOVABLE_CRON_SECRET: cron,
      VITE_SITE_URL: site,
      VITE_ADMIN_EMAIL: admin,
    });
    writeFileSync(".env", env, { mode: 0o600 });
    console.log("✓ wrote .env (scheduler secret generated)");
  }

  const dbUrl = await ask("DATABASE_URL", "Postgres connection string to install schema now (blank = skip)");
  if (dbUrl) {
    const env = Object.fromEntries(
      readFileSync(".env", "utf8").split("\n").map((l) => l.split(/=(.*)/s).slice(0, 2)),
    );
    const r = spawnSync("./scripts/setup-db.sh", env.VITE_SITE_URL?.startsWith("http://localhost") ? ["--no-cron"] : [], {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: dbUrl, SITE_URL: env.VITE_SITE_URL, CRON_SECRET: env.LOVABLE_CRON_SECRET },
    });
    if (r.status !== 0) console.log("✗ database install failed — see output above");
  }
  rl.close();
  console.log("\nNext: `bun run doctor`, then `bun run dev`. Create an admin user: database/create-admin.sql.");
}

if (import.meta.main) main();
