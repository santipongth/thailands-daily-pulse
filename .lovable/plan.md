# Prepare the project for open-source release on GitHub

Goal: anyone can clone the repo, create their own database, and run the site on their own server or a cloud host. The README explains each step clearly in English and Thai. License is MIT. The database ships as structure plus setup data, with no collected readings and no admin accounts.

## What gets added to the repository

```text
README.md            English: what it is, features, architecture, install, deploy, configure, contribute
README.th.md         Full Thai version (linked from the top of README.md)
LICENSE              MIT
CONTRIBUTING.md      How to add a data source/metric, code style, PR checklist
SECURITY.md          How to report vulnerabilities; what must never be made public
CODE_OF_CONDUCT.md   Contributor Covenant
.env.example         Every setting with a description (no real values)
database/
  README.md          How the database files fit together
  schema.sql         Full current structure: tables, rules (RLS), grants, functions, triggers, storage buckets
  seed.sql           Setup data: families, metrics + thresholds, source registry, source settings, holidays, tax deadlines, release calendar, app settings that are safe to share
  cron.sql           The 11 scheduled jobs (freeze 05:45, publish 05:55, early rounds, hourly, dams, social 30 min, prune, lag), with YOUR_SITE_URL / YOUR_CRON_SECRET placeholders
  create-admin.sql   Template to give one account the admin role
scripts/
  export-db.sh       Regenerates schema.sql / seed.sql from a live database (for maintainers)
  setup-db.sh        One command: apply schema → seed → cron to a fresh Postgres/Supabase
docker-compose.yml   Optional local stack (self-hosted Supabase services + app) for trying it out
.github/
  workflows/ci.yml   Install, typecheck, lint, unit tests, build on every PR
  ISSUE_TEMPLATE/    Bug report, new data source request
  pull_request_template.md
docs/
  architecture.md    Diagram of the pipeline: sources → queue → evidence → observations → detection → ranking → brief → API/MCP
  data-sources.md    Every source: owner, URL, cadence, licence, fetch mode, known blocks (generated from the source registry)
  deployment.md      Step-by-step for Cloudflare Workers, a Node/VPS server (Docker), and Supabase Cloud vs self-hosted Supabase
  operations.md      Cron, health check, circuit breaker, retention, backups, troubleshooting
```

The existing `drizzle/migrations` (51 files) stay as the full history. `database/schema.sql` is the quick path for new installs.

## README contents (both languages)
1. What it does: one sentence plus a screenshot, and the "no change → no signal" principle
2. Features: daily brief, signals, evidence, public API/MCP, admin area
3. Tech stack: TanStack Start, React 19, Tailwind 4, Postgres (Supabase), Cloudflare Workers
4. Quick start (local, about 10 minutes): prerequisites → clone → `bun install` → create a Supabase project (cloud or self-hosted) → `scripts/setup-db.sh` → fill `.env` → `bun dev` → create the admin account → trigger the first ingest
5. Settings table: each variable, whether it is required or optional, where to get it, and what breaks without it. AI and Firecrawl are optional; the site works without them, but some sources and the brief intro are reduced.
6. Deploy guides: Cloudflare Workers (recommended), Docker/VPS, any Node host. Scheduling via pg_cron or an external cron calling `/api/public/ingest` and `/api/public/brief` with the cron secret.
7. How the daily cycle works (Bangkok time) and the key design rules (thresholds, late arrivals, versioning, no gap filling)
8. Public API and MCP: short summary with links to `/developers`
9. Adding a new data source (step by step)
10. Project structure map, testing, FAQ/troubleshooting, data licences and attribution, credits, license

## Making it portable (small code changes)
- Hard-coded site URLs (for example in the API docs and OpenAPI) read from a `SITE_URL` setting, with the current address as the fallback.
- The AI calls currently go to the Lovable AI gateway. They will read `AI_BASE_URL` and `AI_API_KEY`, so any OpenAI-compatible provider works. Default behaviour stays the same.
- Firecrawl keeps reading `FIRECRAWL_API_KEY`. The README documents a direct Firecrawl key as an alternative.
- Remove the stray `null` file from the project root. Update `.gitignore` so `.env` is never committed.

## Safety checks before publishing
- Scan the repo for secrets, keys, passwords and the admin email, and remove any that turn up. The admin password stays out of all files.
- seed.sql excludes: user accounts and roles, app_settings rows holding internal state, raw evidence, collected readings, jobs and logs.
- Run `setup-db.sh` against a throwaway empty Postgres in the sandbox to confirm schema + seed + cron apply cleanly.
- Typecheck and build still pass.

## How it reaches GitHub
Lovable syncs the code itself. After this work, connect GitHub from the + menu in the chat box (GitHub → Connect project). This creates the repository, and every file above goes in automatically. The repo can then be set to Public on GitHub.

## Technical details
- schema.sql comes from `pg_dump --schema-only` of the `public` schema plus bucket and policy statements for `evidence` and `brief-images`. It is cleaned of Supabase-internal owners, and Supabase roles (anon, authenticated, service_role) are documented as prerequisites. Plain Postgres users get a short role bootstrap block.
- seed.sql is `INSERT … ON CONFLICT DO NOTHING` for families, metrics, source_registry, source_config, holidays, tax_deadlines, release_calendar, and safe app_settings keys (holiday_url, longdo_mode, thaiwater_mode).
- cron.sql uses `cron.schedule` with `net.http_post` against `${SITE_URL}` and the `x-cron-secret` header, matching the current 11 jobs and their UTC schedules.
- AGENTS.md gets one rule: `database/` is the install snapshot and must be re-exported (`scripts/export-db.sh`) whenever migrations change.
