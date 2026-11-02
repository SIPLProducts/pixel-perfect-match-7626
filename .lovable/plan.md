# Asset360 Review: UI/UX, Dashboard, Reports

Review only. Nothing has been changed. Each section below is a separate plan you can approve on its own.

## Findings

### Shared UI/UX
- One large workspace file holds the sidebar, top bar, dashboard, asset register, reports, settings and the general module pages. That makes visual changes risky.
- KPI cards and "Needs attention" rows build their colours from text at runtime (`bg-${tone}/10`). Tailwind can drop these classes, so icon backgrounds may not appear.
- Every KPI card shows a green "↗" arrow, even though no trend is calculated. This suggests growth that is not in the data.
- Audit trail and some master pages use a generic card grid (`ModulePage`) with no search, filter, date or user name.
- Panels mix semi-transparent fills (`bg-white/35`, `bg-white/50`, `border-white/65`) instead of theme colours. This breaks dark mode and makes contrast inconsistent.
- Empty, loading and error states each use their own styles.

### Dashboard (`Dashboard` in workspace.tsx)
- Data source: the live workspace cache (`data.assets`, `data.verifications`), filtered in the browser by category, location, status (active/inactive) and installation age.
- KPIs: Total assets, Acquisition cost (`purchase_value`), Current value (`current_value`), Average equipment life (capitalization, then purchase, then created date), Active / inactive.
- Charts: age-band bar chart and active/inactive donut (recharts).
- Panels: Recent assets (first 6 rows), Needs attention (Inactive, Maintenance due = assets with status under_maintenance or under_repair, Warranties expiring within 90 days, Pending verification).
- Issues:
  - "Pending verification" is still shown, but the Verification module was removed at your request. It reports every asset minus verified ones, which is misleading.
  - "Maintenance due" counts asset statuses, not open service requests.
  - "Recent assets" is not sorted by date.
  - The category filter does not understand parent/subcategories, so choosing a parent shows no assets.
  - The status filter is only active/inactive. The asset statuses themselves are not available as filter choices.
  - Export offers CSV and PDF only. There is no Excel option.

### Reports (`Reports` in workspace.tsx)
- There are three cards: Asset register, Maintenance summary and Verification status. **All three download the same asset register CSV.** The maintenance and verification reports do not exist.
- The Reports page has no filters.
- No Excel (.xlsx) download exists anywhere in Reports. The app already uses exceljs in the browser for the import template, so it can be reused.
- Transfers, service requests, QR print counts, warranty and attachments are already in the workspace data but have no report.

### Keep as is (reuse)
- `workspaceQueryOptions` / `useWorkspaceSync`: shared tenant cache and live updates.
- `dashboard-export.ts` (`saveBlob`, CSV/PDF builders), the exceljs pattern in `asset-import.ts`, `assetErpFields`/`erpDisplayValue`, `categoryPath`, `latestAssetTransfers`, `qr-print-history`, `Status`, `AssetTable`, `AssetFilter`, shadcn UI components.
- No changes to the backend, access rules, SAP adapter, QR, import or server functions.

## Plan A: UI/UX (priority order)
1. Pull Dashboard, Reports, Kpi, Status and ModulePage out of workspace.tsx into their own files without changing behaviour.
2. Replace the runtime-built colour classes with a fixed tone map using theme colours. Replace `bg-white/xx` with theme surface colours so dark mode works.
3. Remove the fake trend arrow from KPI cards.
4. Use one shared component each for empty, loading and error states, and one shared page-section header.
5. Make Audit trail a searchable table: date, event, asset, user name (looked up within the same workspace), plus a date-range filter.
- Files: workspace.tsx, new `src/components/asset360/dashboard.tsx`, `reports.tsx`, `kpi-card.tsx`, `audit-trail.tsx`, styles.css.
- Risk: a regression while splitting the file. Mitigation: move code only, then compare screenshots before and after.

## Plan B: Dashboard (priority order)
1. Replace "Pending verification" with "Open service requests", counted from real `data.maintenance` rows that are not closed.
2. Sort "Recent assets" by created date, newest first.
3. Make the category filter hierarchy-aware: choosing a parent includes its subcategories.
4. Offer each real asset status as a filter choice, alongside the Active/Inactive grouping.
5. Add "Export Excel" next to CSV/PDF. It uses the same `DashboardReport` data, with one worksheet per section.
6. Optional new charts, built only from existing data: assets by category (top 8) and by location. These need approval because they add visible content.
- All figures stay calculated from live tenant data. No sample data.
- Risk: totals change once the misleading verification figure is replaced. This is expected and should be communicated to users.

## Plan C: Reports (priority order)
1. Add one shared Excel exporter (`src/lib/report-export.ts`) built on exceljs and loaded only when needed. It adds a header block (workspace, generated time, filters applied), bold frozen column headings and number/date formatting. CSV stays available.
2. Add a filter bar to Reports: category (hierarchy-aware), location, status and date range.
3. Fix the reports so each card downloads its own data:
   - Asset register: all ERP fields from `assetErpFields`, plus latest transfer and QR print count.
   - Service requests: number, asset, type, status, reporter, raised and updated dates.
   - Transfers: asset, from/to location and custodian, status, approval, dates.
   - Warranty and AMC expiry: assets with warranty end in the next 30, 60 or 90 days.
   - QR print history: ledger rows per asset.
   - Remove the Verification card, since the module was removed.
4. Each card shows a row count for the active filters, plus Excel and CSV buttons. Buttons are disabled when there are 0 rows.
- Files: workspace.tsx (or the new reports.tsx), new report-export.ts and report-builders.ts. No server or database changes, because all data already comes from the tenant-scoped workspace read.
- Risks: browser memory on very large workspaces (fine at about 270 assets); exceljs adds weight to the bundle, so it is loaded on demand.

## Testing
- Unit tests (vitest, next to the existing lib tests): report row builders for each report, the hierarchy-aware category filter, the warranty window boundaries (30/60/90 days), the open service request count, and that the Excel header block shows the applied filters.
- Run the full existing suite (currently 94 tests) and confirm it is clean.
- Browser check signed in as a manager: dashboard figures match the asset register counts; download each Excel file and read it back to confirm rows and headings; check mobile and desktop screenshots, including dark mode.
- Regression check: add/edit asset, import, QR labels, transfers, service requests, SAP mode and Users & Access still work.

## Questions before building
- Should "Pending verification" be replaced by "Open service requests" or simply removed?
- Should the new category and location charts (Plan B step 6) be added?
