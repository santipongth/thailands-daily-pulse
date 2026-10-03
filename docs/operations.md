# Operations

## Daily cycle (Asia/Bangkok)
| Time | Job | Endpoint |
|---|---|---|
| every :05 | hourly collection, custom admin times, TMD catch-up | `POST /api/public/ingest` |
| every :20 | dams | `?mode=dams` |
| every 30 min | FM91 / BTS / MRT posts, custom schedules | `?mode=social` |
| 00:10, 03:00, 05:00 | forced early rounds before the cutoff | `?mode=early` |
| 05:30 | full run of every source | `?mode=daily` |
| 05:45 | brief data cutoff | `POST /api/public/brief?step=freeze` |
| 05:55 (+05:58) | publish the brief | `?step=publish` |
| 03:30 | delete jobs, snapshots, news and social posts older than 90 days | SQL `prune_old_data()` |
| 03:35 | refresh each metric's arrival lag | SQL `refresh_metric_lag()` |

All HTTP jobs send `Authorization: Bearer <LOVABLE_CRON_SECRET>`.

### External scheduler (if you don't have pg_cron)
Example crontab (server clock in UTC):
```cron
5 * * * *     curl -fsS -X POST -H "Authorization: Bearer $S" https://SITE/api/public/ingest
20 * * * *    curl -fsS -X POST -H "Authorization: Bearer $S" "https://SITE/api/public/ingest?mode=dams"
*/30 * * * *  curl -fsS -X POST -H "Authorization: Bearer $S" "https://SITE/api/public/ingest?mode=social"
10 17 * * *   curl -fsS -X POST -H "Authorization: Bearer $S" "https://SITE/api/public/ingest?mode=early"
0 20,22 * * * curl -fsS -X POST -H "Authorization: Bearer $S" "https://SITE/api/public/ingest?mode=early"
30 22 * * *   curl -fsS -X POST -H "Authorization: Bearer $S" "https://SITE/api/public/ingest?mode=daily"
45 22 * * *   curl -fsS -X POST -H "Authorization: Bearer $S" "https://SITE/api/public/brief?step=freeze"
55,58 22 * * * curl -fsS -X POST -H "Authorization: Bearer $S" "https://SITE/api/public/brief?step=publish"
```
Run the two SQL jobs with `psql "$DATABASE_URL" -c "select prune_old_data()"` (and `refresh_metric_lag()`).

## Monitoring
- `GET /api/public/health` returns `ok` or `degraded`, plus database latency, queue backlog, the latest brief and the freshness of each source. It returns **503** when the database is down or today's brief is still missing after 06:30, which makes it easy to plug into an uptime monitor.
- Admin pages: `/admin` (stale sources, late signals), `/tracking` (per-source windows and cutoff reasons), `/raw-log` (fetch log and performance tips), `/failures`.

## Controlling sources and costs
Use the admin source manager (`/admin` → จัดการแหล่งข้อมูล) to:
- Turn each source on or off, and pick its schedule: built-in default, hourly, every 3 h, daily at a set hour, an hourly range, custom HH:MM times, or manual only.
- Choose the request mode (auto, direct or Firecrawl), the number of attempts and the retry delay.

Fetches from X/Twitter go through Firecrawl at about 30 credits each. Turn those sources off if you have no Firecrawl budget.

## Retention and backups
- Raw evidence, signals, signal versions, briefs and daily performance stats are **kept forever**. Operational rows are deleted after 90 days.
- Back up with `pg_dump "$DATABASE_URL" -Fc > backup.dump`, and copy the `evidence` storage bucket as well.

## Troubleshooting
| Symptom | Likely cause |
|---|---|
| A source keeps failing with 403 or 526 | The site blocks datacenter IPs or has a bad certificate. Set its mode to Firecrawl or leave it off. The failure stays visible on `/tracking`. |
| No brief at 06:00 | Check the cron jobs and the secret (look for 401s in your app logs). `/api/public/health` shows `brief.late`. |
| No signals for weeks | Expected while values don't change, or before ~14 days of data exist for weekly comparisons. See `/unchanged`. |
| AI features paused | The provider returned 402/403. Fix billing, then un-pause in admin settings. |
| A source shows "paused" | The circuit breaker tripped. It retries automatically, or you can reset it in admin. |
