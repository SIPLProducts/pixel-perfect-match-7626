# Dashboard filters

## What will change
- Add a compact filter bar above the dashboard metrics.
- Include filters for asset category, location, active status, and installation age period.
- Add a clear reset action and a visible filtered-results count.
- Recalculate all dashboard totals, charts, attention counts, and recent assets from the selected filters.
- Keep the existing Frosted Glass styling and make the filter bar usable on mobile.

## Technical details
- Keep filter state inside the dashboard so the asset register remains unchanged.
- Use the existing category and location records for filter labels.
- Treat `active`, `assigned`, and `in_stock` as Active; all other statuses as Inactive.
- Installation periods will match the existing age groups: under 1 year, 1–3 years, 3–5 years, and 5+ years.
- Verify the result in the signed-in desktop and mobile previews.
