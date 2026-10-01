# Daily government data changes: real comparisons, alerts, and a per-day Signal page

## What tonight's tests found

- **gdcatalog.go.th (the national government data catalog) works.** It is a public CKAN API, and agencies and provinces publish official datasets on it:
  - "กรมปศุสัตว์" matches 71 datasets, e.g. dairy cattle and livestock farmers (CSV, updated 22 Sep).
  - "กรมเจ้าท่า" matches 36 datasets, e.g. Phuket boat trips and domestic freight.
  - Bangkok and provincial administrations match 150+ datasets, several updated today.
- The direct sites for กรมเจ้าท่า, the Livestock Department's own catalog and data.bangkok.go.th are behind bot challenges ("Just a moment..."), so the direct crawler can't read them. The existing crawler stays for sites that do answer (e.g. กรมที่ดิน), and failures keep showing on the "ดึงไม่ได้" page.

So the reliable "direct from government" path is the official catalog. The system will track the actual datasets, not news pages.

## What users will get

1. **More agencies with real data:** กรมปศุสัตว์, กรมเจ้าท่า, กรุงเทพมหานคร and provincial administrations (อบจ.), plus anything already working. You pick which ones to watch in Settings.
2. **A real day-by-day comparison:** every day the system records each watched dataset: when it was last updated, a fingerprint of each file, and for small CSV files the row count and totals of numeric columns. A Signal appears only when something actually differs from yesterday: a new dataset, a file updated, rows added or removed, or a total that changed. Unchanged datasets stay silent.
3. **A clear reason on every Signal:** for example "กรมปศุสัตว์ (ลพบุรี) อัปเดตชุดข้อมูล 'จำนวนโคนม' — file changed on 1 Oct, rows 120 → 134 (+14), total 5,210 → 5,480". It also links straight to the official dataset and file.
4. **Alerts:** when you open the site and an agency you watch changed today, a banner shows "หน่วยงานที่คุณติดตามมีข้อมูลเปลี่ยนวันนี้" and links to that dataset's raw data. You can also allow browser notifications, which fire while the site is open in a tab.
5. **Per-day Signal page:** pick a date to see that day's Signals next to the previous day's: new today, gone since yesterday, and still continuing. Each row shows the value before and after.

## Limits

- Browser notifications only work while the site is open in a tab. Notifications with the site fully closed (email or LINE) need a delivery service, and that can be a later step.
- Some datasets are updated only monthly or yearly. They stay silent until a new version appears, which is the intended behaviour.

## Technical details

- New tables (public read, server-only writes):
  - `gov_datasets` (catalog id, org, title, url, watched agency key)
  - `gov_snapshots` (dataset_id, snap_date, metadata_modified, resource_hash, row_count, numeric_totals jsonb). Unique on dataset and date.
  - `gov_changes` (dataset_id, change_date, kind new/updated/rows/value, before, after, reason_th)
- `src/lib/catalog.server.ts`:
  - Calls `package_search` per watched agency (keyword or organization, sorted by metadata_modified, capped at about 50 datasets per agency).
  - Downloads only CSV files under 2 MB to compute row counts and totals.
  - Diffs each snapshot against the previous one and writes `gov_changes`.
  - Records the outcome per agency in `source_runs`, so failures appear on the "ดึงไม่ได้" page.
- Signals: add a `gov_change` path to detection, either by extending `detect_signals` or with a companion SQL function. One Signal per changed dataset per day, with severity by change type (new or value change = medium, metadata-only update = low). The Signal's reason text comes from `reason_th`.
- The catalog run joins the existing hourly ingest, but snapshots are taken once per Bangkok day, which keeps the daily comparison stable.
- Agency registry in `src/lib/sources.ts` gains the catalog agencies. Settings toggles reuse the per-device preferences.
- Alerts: the homepage reads today's `gov_changes` for watched agencies and shows a banner. Optional `Notification` permission, stored per device.
- New route `/day/$date`: today's vs the previous day's signals, grouped new / ended / continuing. It links from the masthead and date navigation.
- "ทำไมถึงเปลี่ยน?" shows the gov_change reason, before/after values and the dataset link first, with news as background only.
- Update `AGENTS.md` and `roadmap.md`.
