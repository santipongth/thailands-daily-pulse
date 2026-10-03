# Thailand Daily Signals

**English** · [ภาษาไทย](README.th.md)

> **What changed in Thailand today that could affect my life?**
> A daily, evidence-backed brief built only from official and reliable data. **No change → no signal.**

[![CI](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml) ![License: MIT](https://img.shields.io/badge/license-MIT-green)

Live site: https://thailandsignals.thoughtmind.app · API docs: [/developers](https://thailands-daily-pulse.lovable.app/developers)

![Today page](docs/screenshot.png)

---

## Table of contents
- [What it does](#what-it-does)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start-local-about-10-minutes)
- [Configuration](#configuration)
- [Deploy](#deploy)
- [How it works](#how-it-works)
- [Public API & MCP](#public-api--mcp)
- [Adding a data source](#adding-a-data-source)
- [Project structure](#project-structure)
- [FAQ](#faq)
- [Contributing, security, licence](#contributing-security-licence)

## What it does
The app collects about 30 Thai data sources every day: fuel, gold, exchange rates, food and farm prices, electricity, cooking gas, minimum wage, PM2.5, weather, rain, dams and floods, BTS/MRT disruptions, earthquakes, traffic, lottery results, holidays and tax deadlines. Each value is compared with **official thresholds**. Only real changes become *signals*. At **06:00 Bangkok time** it publishes a brief, frozen at a 05:45 data cutoff, that links every signal to its evidence.

Principles:
- **No change → no signal.** There is no filler and no near-threshold noise.
- **Never invent data.** Gaps stay gaps. A blocked source fails visibly; it is never guessed.
- **Honest dates.** Each value keeps the date it refers to, the date it takes effect, when it was published, and when it was received.
- **Auditable.** Raw files are archived with a sha256 hash, signals are versioned (corrected or withdrawn), and scores show their working.

## Features
- **Today page**: above-threshold signals with weekly comparisons, a Bangkok map (PM2.5, water, roads, weather, rail), weather stations, BTS/MRT notices, social and news context, and lottery results
- **Daily brief** with a data window, a completeness report and post-publication updates
- **Cost of living**: the real price of a fixed household basket, with weekly and monthly trends
- **Per-station pages** and an "unchanged" tracker (for example, cooking gas unchanged since 2023)
- **Search** across signals and updates
- **Public read-only REST API** (16 resources, OpenAPI 3.1), an **MCP server** (17 tools) for AI agents, and `llms.txt`
- **Admin area**: a source manager (on/off, schedules, custom times, request mode, retries), evidence viewer, fetch log with performance tips, late-arrival list, and a circuit breaker
- **Health endpoint** for uptime monitoring

## Tech stack
| | |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) v1 (React 19, SSR, server functions), Vite 7 |
| Styling | Tailwind CSS v4, shadcn/ui, editorial Thai typography |
| Database | PostgreSQL via [Supabase](https://supabase.com) (row-level security, Auth, Storage, pg_cron, pg_net) |
| Runtime | Cloudflare Workers / workerd (also runs in Docker) |
| Optional | Any OpenAI-compatible AI API · [Firecrawl](https://firecrawl.dev) for blocked pages |
| Tests | Vitest (parsers and calculation helpers) |

## Quick start (local, about 10 minutes)
**You need:** [Bun](https://bun.sh) 1.1+ (or Node 20+), `psql` 15+, Git, and a free Supabase project (cloud or [self-hosted](https://supabase.com/docs/guides/self-hosting/docker)).

```sh
# 1. Get the code
git clone https://github.com/<you>/thailand-daily-signals.git
cd thailand-daily-signals
bun install

# 2. Create the database (Supabase: enable pg_cron + pg_net first, and turn sign-up off)
export DATABASE_URL='postgresql://postgres:PASSWORD@HOST:5432/postgres'
./scripts/setup-db.sh --no-cron        # structure + setup data (categories, metrics, sources, calendars)

# 3. Configure
cp .env.example .env                    # fill in the Supabase URL, keys and a random LOVABLE_CRON_SECRET

# 4. Run
bun run dev                             # → http://localhost:8080

# 5. Collect the first data
curl -X POST -H "Authorization: Bearer $LOVABLE_CRON_SECRET" "http://localhost:8080/api/public/ingest?mode=daily"
```
**Prefer a form?** Open `/setup` on your running site: it tests your own database from your browser and generates `.env` and deploy commands (keys never leave your browser).

Then create an admin user in Supabase Auth, run `database/create-admin.sql` with that email, and sign in at `/admin/login` (the username `admin` maps to `VITE_ADMIN_EMAIL`).

> A new install starts empty. Signals appear once values change, and weekly comparisons need about 14 days of collected data.

## Configuration
All settings are in [`.env.example`](.env.example).

| Variable | Required | Where to get it | What happens without it |
|---|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | yes | Supabase → Project Settings → API | the site can't load data |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | yes | same values, server-side | server reads fail |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Supabase → API → secret key (**server only**) | no ingestion and no admin writes |
| `LOVABLE_CRON_SECRET` | yes | `openssl rand -hex 32` | scheduled jobs are rejected |
| `VITE_SITE_URL` | recommended | your public URL | links fall back to the original site |
| `VITE_ADMIN_EMAIL` | recommended | your admin's email | the `admin` username won't map to your account |
| `AI_BASE_URL` + `AI_API_KEY` (or `LOVABLE_API_KEY`) | optional | any OpenAI-compatible provider | brief intro, FM91 tagging, LPG reading and images pause; everything else works |
| `FIRECRAWL_API_KEY` | optional | firecrawl.dev | X/Twitter, BMA flood, DDPM and EPPO LPG report "blocked" |

## Deploy
Full guide: [docs/deployment.md](docs/deployment.md).

- **Cloudflare Workers** (recommended): `bun run build && npx wrangler@4 deploy`, with secrets set through `wrangler secret put`.
- **Docker / VPS**: `docker compose up -d --build` serves on port 8787 using the same workerd runtime.
- **Any Linux server**: `bun run build && bun run start` (keep it running with systemd or pm2).
- **Database**: Supabase Cloud or self-hosted Supabase.
- **Scheduler**: `./scripts/setup-db.sh` installs 11 pg_cron jobs, or use any external cron ([docs/operations.md](docs/operations.md)).

## How it works
```text
sources → politeFetch → raw evidence (sha256) → observations (4 dates)
        → detect_signals (SQL, official thresholds) → versioned events → rank
        → 05:45 freeze → 05:55 publish brief → web · REST · MCP
```
| Bangkok time | What happens |
|---|---|
| 00:00–05:45 | data window for today's brief, with forced rounds at 00:10, 03:00, 05:00 and 05:30 |
| 05:45 | cutoff: data received later goes to *brief updates* |
| 05:55 | the brief is published and frozen |
| all day | hourly, 30-minute and per-source collection; late data keeps its original date |

Signal levels: **high** (≥ 3× the threshold, or crossing ≥ 2 bands), **medium** (≥ 1.5×), **low** (kept in history but hidden on Today). Details: [docs/architecture.md](docs/architecture.md).

## Public API & MCP
```sh
curl 'https://YOUR_SITE/api/public/v1/signals?limit=10'
curl 'https://YOUR_SITE/api/public/v1/observations?id=lpg&limit=5'
```
- REST v1: 16 read-only resources, a 120 requests/min/IP limit, CORS `*`, and OpenAPI at `/api/public/openapi.json`
- MCP: `POST /mcp` (Streamable HTTP), 17 read-only tools
- Full reference, generated from the code, at `/developers` on your site

## Adding a data source
Short version (full steps in [CONTRIBUTING.md](CONTRIBUTING.md#adding-a-data-source)):
1. Write a parser in `src/lib/<source>.ts` with a fixture test.
2. Register it as a connector in `src/lib/connectors.server.ts`.
3. Add a migration with the `metrics` (official thresholds) and `source_registry` rows.
4. Add a job spec in `src/lib/source-config.server.ts` so it appears in the admin source manager.
5. Run `scripts/export-db.sh` and update [docs/data-sources.md](docs/data-sources.md).

## Project structure
```text
src/
  routes/              pages (index = Today, brief, cost-trend, stations, search, developers…)
    _admin/            admin pages (role-gated, client-only)
    api/public/        cron endpoints, REST v1, health, OpenAPI, OG images
    mcp.ts             MCP server endpoint
  lib/                 parsers (*.ts + tests), server logic (*.server.ts), server functions (*.functions.ts)
    mcp/               MCP tool definitions
  components/          UI (editorial primitives, charts, maps)
database/              schema.sql · seed.sql · cron.sql · create-admin.sql
drizzle/migrations/    full migration history
scripts/               setup-db.sh · export-db.sh
docs/                  architecture · deployment · operations · data-sources
AGENTS.md              design rules (also read by AI coding agents)
```
Commands: `bun run dev | build | test | typecheck | lint | start | deploy | db:setup | db:export`

## FAQ
**Why do I see no signals?** Nothing has crossed an official threshold yet, or there isn't enough history. Check `/unchanged` and `/tracking`.<br>
**A government site blocks my server.** Some Thai sites block datacenter IPs or have broken certificates. Set the source to Firecrawl mode, run from a Thai IP, or leave it off. Failures are shown, never hidden.<br>
**Can readers change thresholds?** No. Thresholds are official values in the `metrics` table, so everyone sees the same signals.<br>
**Is Supabase required?** It is strongly recommended (Data API, Auth, Storage, pg_cron). Self-hosted Supabase is free. See `database/README.md` for bare Postgres.<br>
**Can I adapt it to another country?** Yes. Replace the connectors, metrics and sources. The detection, versioning, brief and API layers are generic.

## Contributing, security, licence
- Contributions are welcome: [CONTRIBUTING.md](CONTRIBUTING.md) · [Code of Conduct](CODE_OF_CONDUCT.md)
- Report vulnerabilities privately: [SECURITY.md](SECURITY.md)
- Code: [MIT](LICENSE). **Data belongs to its owners**: check each source's terms in [docs/data-sources.md](docs/data-sources.md) before redistributing.

Data credits: Thai Meteorological Department, GISTDA, Pollution Control Department, Royal Irrigation Department, HII (ThaiWater), BMA, DDPM, EPPO, Department of Internal Trade, Ministry of Labour, PEA, GLO, Revenue Department, PTT, Bangchak, Gold Traders Association, Longdo Traffic, FM91, BTS, BEM, Thai PBS, Prachatai and others.
