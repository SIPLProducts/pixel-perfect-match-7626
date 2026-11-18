# Show all Asset QR Report API fields in the Assets table

## Goal
The Asset QR Report API now returns 69 fields (see the attached document). Every one of them should appear in the existing Assets table, with the readable names from the document (e.g. "Company Code", "Book Value", "End Book Value", "Remaining Useful Life"). Existing columns, filters, search, pagination, QR, labels, manual assets and sync behaviour stay exactly as they are.

## What changes for the user
- After a Sync SAP, SAP assets show all 69 API fields as extra columns in the Assets table, to the right of the current columns, in the document's order (S.No. 1 to 69).
- The table scrolls horizontally; current columns stay where they are.
- Manual assets show "—" in these extra columns.
- Assets synced before this change fill in on the next Sync SAP (QR codes and asset IDs are kept).

## How it works (additive only)
1. Database: add one new optional column on assets, `sap_fields` (JSON), holding the full raw API row. No existing column is changed or removed.
2. Sync: the existing sync keeps mapping fields into the current columns as today; it additionally saves the complete row into `sap_fields`. Manual assets are never touched (same rule as today).
3. Field list: a new label list with the 69 keys and descriptions from the document, used to build the extra table columns. Values: numbers formatted like other values, dates shown as dates, blanks as "—".
4. Assets table: append the 69 columns after the existing ones, reading from `sap_fields`.

## Technical details
- New migration `0030_sap_fields.sql`: `alter table public.assets add column if not exists sap_fields jsonb;` and `create or replace` of `sync_sap_asset_rows` that sets `sap_fields` on insert and on SAP re-sync update (same conflict/ownership guards). Reversible (drop column). Must also be run on the self-hosted Quality/Production databases.
- `mapSapRow` gains `sap_fields: row` (untouched otherwise); new `src/lib/sap-report-fields.ts` with the 69 key/label pairs.
- Assets workspace query includes `sap_fields`; table header/body append columns.
- Tests: mapping keeps raw row; label list contains all 69 keys from the document.

## Not changed
Existing columns, mappings, QR tokens, labels, imports, manual Add Asset, permissions and tenant isolation.
