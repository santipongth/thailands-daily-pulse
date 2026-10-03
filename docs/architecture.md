# Architecture

```text
 Official sources (APIs, XML, RSS, web pages)            Scheduler (pg_cron → HTTPS)
        │  politeFetch: browser headers, 120 s timeout,          │
        │  retry 429/5xx ×3, Firecrawl only if blocked           ▼
        ▼                                               /api/public/ingest (modes)
 ┌──────────────┐   ┌──────────────────┐   ┌──────────────────────────────┐
 │ ingest_jobs  │──▶│ raw_evidence     │──▶│ observations                 │
 │ (queue,      │   │ sha256 dedup,    │   │ observed_on / effective_from │
 │ breaker)     │   │ private bucket   │   │ published_at / received_at   │
 └──────────────┘   └──────────────────┘   └──────────────┬───────────────┘
                                                          ▼
                     detect_signals(date) / detect_received_signals(date)   ← SQL, official thresholds
                                                          ▼
                     signals ──trigger──▶ signal_events + signal_versions  (versioned, withdrawals)
                                                          ▼
                     rank_signals(date): severity × z × trust × reach × evidence
                                                          ▼
          05:45 freeze ─▶ 05:55 publish  daily_briefs (frozen) ─▶ later changes → brief_updates
                                                          ▼
   Web (TanStack Start SSR)   ·   REST /api/public/v1   ·   MCP /mcp   ·   OpenAPI   ·   /api/public/health
```

## Layers
| Layer | Where |
|---|---|
| Pages (SSR, React 19, Tailwind 4) | `src/routes/*.tsx`. Admin pages are under `src/routes/_admin/` (client-only, role-gated) |
| Server functions (typed RPC) | `src/lib/*.functions.ts` |
| Server-only logic | `src/lib/*.server.ts`: ingest, queue, connectors, evidence, brief, breaker |
| Pure parsers and helpers (unit-tested) | `src/lib/*.ts` with `*.test.ts` |
| HTTP endpoints (cron, API, MCP, OG images) | `src/routes/api/public/*`, `src/routes/mcp.ts` |
| Database logic | SQL functions in `database/schema.sql` (history in `drizzle/migrations/`) |
| Rules for agents and contributors | `AGENTS.md`, `src/lib/AGENTS.md` |

## Key design decisions
- **Detection runs in SQL** (`detect_core`), so thresholds, gaps, volatility and trust apply the same way everywhere. Every passed rule is stored in `signals.checks`.
- **Honest timing**: the brief only uses data received before 05:45 Bangkok time. Late data keeps its original date and appears on the day it arrives (`late_window_days` per metric).
- **Versioning**: each `metric:date` is one event. A content change creates a new version. Deleting a signal records a withdrawal.
- **Evidence first**: every fetch is archived and deduplicated by sha256. Ranking gives a bonus when the source file actually changed that day.
- **Circuit breaker**: after 3 failed rounds a source pauses for 4 h. Manual runs and the 05:xx rounds bypass it.
- **Security**: the public reads through row-level security as `anon`. All writes happen server-side with the service role, after a `requireAdmin` or cron-secret check.
