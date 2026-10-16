# Category-based Excel template selection

## What was found

**File 1 – "New Microsoft Excel Worksheet.xlsx" (IT / laptops)**
- One sheet "Sheet1", 18 columns: S.No, Asset, Employee Name, EMP ID, Location, Division, Subdivision, Laptop/Desktop, Device Name, Make, Model, Serial No, Operating System, RAM, HDD SIZE, Processor Configuration, Purchase Date, Gross value.
- Holds 5 rows of real-looking data (employee names, IDs, serial numbers, values).

**File 2 – "Plant and machinery format.xlsx"**
- Two sheets: "FAR 30.09.26" (5 data rows) and "CWIP 30.09.26" (about 1,108 data rows), both with the same 26 ERP columns: Asset, Sub-number, Inventory Number, Asset Class, Asset Description, Life, Supplier, Depreciation key, Plant, Profit Center, Location, Capitalized On, Cost Center, Quantity, Base Unit of Measure, Currency, Cum.acq.value, Scrap value, Accum.dep., Write-ups, Pld.unpl.dep., Start book.val, Trans.acq.val, Trns.AccDep, PlndDep, End book val.
- Holds real ERP register values.

**Current flow**
- "Download template" appears in two places (asset register toolbar and the Excel import screen). Both build one generic template in the browser from the shared field list.
- The importer only accepts that generic template's headings. Any other heading is rejected ("Unknown columns…").
- No category is chosen before downloading or importing; each row picks its own category.

## Decisions needed before building

1. **Data inside the files.** Both files contain real records (employee names, salaries-level values, ~1,100 ERP rows). "Use the original file unchanged" would hand that data to every user who downloads the template. Options:
   - a) Ship them exactly as uploaded (data included).
   - b) Keep headings, sheets, widths, colours and formats exactly as-is, but remove the data rows. **Recommended.**
2. **Where the mapping lives.** It must be editable per client without code changes:
   - a) New small settings table "category templates" (category → template), managed from the Categories screen by managers. Needs a database change, so your approval. **Recommended.**
   - b) A deployment config file listing category prefixes per template. No database change, but changing it needs a redeploy.
3. **Import of these formats.** Should these two layouts also be uploadable through Excel import (mapping their headings onto existing asset fields), or is this download-only for now? Mapping import is a separate follow-up; the generic template keeps working either way.

## What will be built (assuming 1b, 2a, download-only)

- Store the two files in the app as fixed downloadable files (CDN-hosted), served byte-for-byte; no regeneration with the spreadsheet library, so names, structure and formatting stay intact.
- A template registry with two entries ("IT / Computer equipment format", "Plant & Machinery format") referenced by a stable template key, not by category names or IDs.
- Mapping: each category (parent or subcategory) can be linked to one template key. A subcategory without its own link inherits its parent's link. Set from the Categories add/edit form ("Excel template" dropdown, with "None").
- Download UI: in the register and the import screen, "Download template" becomes a category picker + download button.
  - Mapped category → downloads that category's file.
  - Unmapped category → clear message: "No Excel template is configured for <category>. Ask a manager to set one in Categories." No fallback to a wrong file.
  - The existing generic template stays available as "Standard Asset360 template" so current imports are unaffected.
- Renaming, re-parenting or adding categories on a client server keeps working because links use the category row, and templates use keys.

## Not changed
Asset registration, existing Excel import/export and its validation, QR generation/labels/scan, transfers, service requests, QRmyCAR, ERP/SAP fields and any integration.

## Technical details
- Migration (only after approval): `category_templates(tenant_id, category_id unique, template_key text check in known keys)`, RLS select for workspace members, writes via manager-only server function deriving tenant from user_roles; cascade delete with category row only via existing delete safeguard semantics (no asset references affected).
- `src/lib/asset-templates.ts`: registry `{ key, label, filename, assetUrl }` + `resolveTemplate(categoryId, categories, links)` (own link → parent link → null).
- Files uploaded with lovable-assets (after optional data-row stripping via openpyxl copy that keeps styles); downloaded via same-origin fetch → Blob → existing download helper.
- Tests: own mapping, parent inheritance, unmapped returns null, unknown key rejected, renamed category still resolves.

## Rollback
Drop the `category_templates` table and revert the UI/registry files; the generic template and all asset data are untouched.
