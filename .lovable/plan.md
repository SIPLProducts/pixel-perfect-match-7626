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
[KPI row (colour cards): Total | Active | Assigned | Under maintenance | Missing | Disposed | Retired | Open service req. | Warranty expiring 90d]
[Assets Added to Asset360 (monthly, 12 months)] [Asset lifecycle donut (status)]
[Top 10 categories (horizontal bars)]          [Top 10 locations/plants (horizontal bars)]
[Service requests monthly trend + by type]     [Warranty expiry donut: expired/30/60/90/later]
[QR insights: Active QR codes | Labels printed | Never printed | QR breakdown reports (no scan counts)]
[Plant-wise summary table: plant | total | active | maintenance | missing | open requests]
[Tables: Upcoming warranty expiries | Recent assets | Open service requests]
```
All widgets respond to the filter bar. Empty states say "No data yet" rather than inventing values. Existing CSV/PDF/Excel dashboard exports remain and include the new sections.

## 4. Implementation steps (after approval)
1. Add pure helpers for monthly buckets, warranty bands, status groups, QR coverage and plant summary in the existing report helpers file, with tests.
2. Build the new dashboard sections as small components using existing chart library and design colours (dark-mode safe).
3. Replace the dashboard body in the workspace screen; keep navigation actions (clicking an asset, "view all").
4. Extend all three existing dashboard exports (CSV, PDF and Excel) with the new sections (KPIs, monthly additions, lifecycle, top categories/locations, service requests, warranty bands, QR insights, plant summary). Existing export buttons, file names and current contents are kept; new sections are only appended.
5. Run the full test suite, check desktop and mobile in a signed-in browser, confirm numbers match the database counts above.

## Technical details
- Files: `src/lib/report-builders.ts` (+tests), new `src/components/asset360/dashboard/*`, `src/components/asset360/workspace.tsx` (Dashboard only), `src/lib/dashboard-export.ts`.
- Data: `WorkspaceData` assets, maintenance, transfers, qr prints, categories, locations from `asset360.functions.ts`. QR print ledger is used if already in the workspace payload; if not, it is read through the existing QR print history helper (no schema change).
- Risks: monthly additions reflect import date (most assets were imported together, so the chart may show one spike) — labelled "Added to Asset360". Large workspaces: all aggregation is memoised client-side.

## Implementation Decisions
1. The monthly chart uses the asset created date and is titled "Assets Added to Asset360". It is not shown as a purchase or capitalization trend.
2. Disposed and Retired KPI cards are always shown as two separate cards, even when the value is 0.
3. QR analytics show only existing QR data, as separate figures: "Active QR codes" (assets with an active QR) and "Labels printed" (print/PDF/PNG outputs from the print ledger), plus assets never printed and QR breakdown reports. No scan counts, because scans are not logged.
4. Workspace security: every KPI, chart, table and export uses only the signed-in user's own active workspace, from the existing workspace-filtered data load protected by tenant isolation and RLS. Nothing combines workspaces. The 271-asset / 5-workspace figure above comes from a database-wide inspection only. Testing includes signing in and checking that dashboard totals match that workspace's own counts.
5. Existing features, QR workflows, permissions, exports and database logic stay as they are. No schema, RLS, SAP or QR changes.
