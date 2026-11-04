# Asset360 Dashboard Redesign — Analysis and Plan

## 1. What the data supports today (checked against live data)

Assets: 271 across 5 workspaces. Status counts: active 120, assigned 41, under maintenance 40, missing 35, in stock 35, disposed 0, retired 0. Warranty end date filled on 270 assets; plant filled on 270; purchase date filled on 0. Active QR codes: 271. QR outputs logged: 12. Verification records: 0.

| Proposed metric | Feasible? | Source |
|---|---|---|
| Total / Active / Under maintenance / Disposed assets | Yes | Asset status (Disposed currently shows 0, a real value) |
| Assets by Category (with parent rollup) | Yes | Category + parent category |
| Assets by Location / Plant | Yes | Location and Plant fields |
| Monthly Asset Additions | Yes, by record created date | Asset created date. Purchase/capitalization date is empty, so a "by purchase month" view is not reliable yet |
| Asset Lifecycle | Yes | Status distribution (in stock, assigned, maintenance, missing, retired, disposed) plus condition |
| Open Service Requests | Yes | Service requests not completed/closed (existing rule) |
| Service requests monthly trend / by type | Yes | Service request created date, type |
| Warranty expiry (expired, 30/60/90 days) | Yes | Warranty end date |
| AMC expiry | No | No AMC field exists; shown as "not tracked" note, no new field |
| QR insights (QR coverage, labels printed, assets never printed, scan breakdown reports) | Yes | QR codes, QR print ledger, service requests with QR source |
| QR scan counts | No | Scans are not logged; not added |
| Asset Verification insights | No | Verification module removed; 0 records. Omitted |
| Asset value / depreciation | Partial | Purchase/current value, accumulated depreciation where filled; shown only if data exists |

## 2. Security and existing behaviour
- Dashboard keeps reading only the existing live, workspace-scoped data already loaded for every screen (same permissions, tenant isolation and RLS). No new queries, tables or backend changes.
- QR generation, scanning, public QR page, SAP mode, imports and exports stay untouched.

## 3. Proposed layout

```text
[Filter bar: Category (parent-aware) | Location/Plant | Status | Date range (added) | Reset]
[KPI row (colour cards): Total | Active | Assigned | Under maintenance | Missing | Disposed/Retired | Open service req. | Warranty expiring 90d]
[Monthly asset additions (bar/line, 12 months)] [Asset lifecycle donut (status)]
[Top 10 categories (horizontal bars)]          [Top 10 locations/plants (horizontal bars)]
[Service requests monthly trend + by type]     [Warranty expiry donut: expired/30/60/90/later]
[QR insights card: coverage %, labels printed, never printed, QR breakdown reports]
[Plant-wise summary table: plant | total | active | maintenance | missing | open requests]
[Tables: Upcoming warranty expiries | Recent assets | Open service requests]
```
All widgets respond to the filter bar. Empty states say "No data yet" rather than inventing values. Existing CSV/PDF/Excel dashboard exports remain and include the new sections.

## 4. Implementation steps (after approval)
1. Add pure helpers for monthly buckets, warranty bands, status groups, QR coverage and plant summary in the existing report helpers file, with tests.
2. Build the new dashboard sections as small components using existing chart library and design colours (dark-mode safe).
3. Replace the dashboard body in the workspace screen; keep navigation actions (clicking an asset, "view all").
4. Extend the dashboard Excel export with the new sheets.
5. Run the full test suite, check desktop and mobile in a signed-in browser, confirm numbers match the database counts above.

## Technical details
- Files: `src/lib/report-builders.ts` (+tests), new `src/components/asset360/dashboard/*`, `src/components/asset360/workspace.tsx` (Dashboard only), `src/lib/dashboard-export.ts`.
- Data: `WorkspaceData` assets, maintenance, transfers, qr prints, categories, locations from `asset360.functions.ts`. QR print ledger is used if already in the workspace payload; if not, it is read through the existing QR print history helper (no schema change).
- Risks: monthly additions reflect import date (most assets were imported together, so the chart may show one spike) — labelled "Added to Asset360". Large workspaces: all aggregation is memoised client-side.

## Open questions
- Should Monthly Additions use created date now, and switch to capitalization date once that field is populated?
- Hide Disposed/Retired KPI while it is 0, or always show it?
