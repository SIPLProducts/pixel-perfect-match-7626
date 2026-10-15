# Parent categories and subcategories

## Current state (checked)
- Categories are a flat list per workspace: Name, Prefix, Description. Unique name and unique prefix per workspace; prefix must be 2-6 letters/digits.
- Every workspace (5 today) has the same 9 categories, each used by 6 assets (270 assets total). None are parents yet.
- Assets point to one category. That category's prefix builds the asset ID (e.g. LAP-000001). Asset IDs and QR labels are stored and never recalculated.
- Categories are used in: Categories screen, asset form, asset register search and filters, Excel template/import (matched by name), dashboard and exports, and the bulk-import step in the database.
- The asset table also has an old free-text "subcategory" field. No screen uses it, and this plan leaves it alone (so no duplicate fields).
- Deleting a category is already blocked by the database when assets use it.

## What you will see
- Categories screen: shows each parent with its subcategories nested under it. Asset counts per subcategory, plus a total for each parent. Search matches parents and subcategories. You can filter by parent.
- Add/Edit category gets a "Parent category" picker. Leave it empty to make a top-level parent. Parents can't be given a parent of their own.
- Asset form: the Category list is grouped by parent (for example "IT & Computer Equipment" with Desktops, Laptops, Mobiles, Networking Equipment, Printers under it). Assets are assigned to subcategories, or to top-level categories that have no subcategories, just as they are today.
- Asset register: a new "Parent category" column and filter next to the existing Category one.
- Excel: the template gets an optional "Parent category" column. The import still matches on Category name, exactly as it does now. If a parent is given and doesn't match, that row is flagged. Old templates without the column still import.
- Dashboard and exports: the category breakdown can be grouped by parent, and existing subcategory figures don't change.

## Starting mapping (each workspace, after you approve)
```text
Furniture & Fixtures            (FURN) -> Chairs, Tables
IT & Computer Equipment         (ITEQ) -> Desktops, Laptops, Mobiles, Networking Equipment, Printers
Electrical & Facility Equipment (ELEC) -> Air Conditioners
Vehicles & Transport            (VTRN) -> Vehicles
Plant & Machinery               (PLNT) -> (empty)
Other Equipment                 (OTHR) -> (empty)
```
- The parent prefixes above are suggestions. Parents need a prefix because the system already requires one, but no asset uses a parent's prefix as long as assets stay on subcategories.
- The 6 parents are added to each workspace. The 9 existing categories only get their parent filled in. Their IDs, names, prefixes and asset links stay the same, and no asset row is touched.

## Rules
- Two levels only: a parent and its subcategories. A category can't be its own parent, and nothing can loop.
- The parent must be in the same workspace and must itself be top-level.
- A category that has subcategories can't become a subcategory.
- A category that assets already use can't become a parent, because those assets would then sit on a parent.
- Names and prefixes stay unique across the whole workspace (current rule), so a parent and a subcategory can't share a name.
- A parent that still has subcategories can't be deleted. Subcategories with assets are still protected, as today.
- Only the same manager roles can make changes (super_admin, admin, asset_manager).

## Database change (needs your approval, additive only)
1. Add a nullable "parent" link on categories that points to another category in the same table. It is set to block deletion, never to clear itself. Plus an index.
2. A validation step in the database that enforces the rules above (same workspace, two levels, no loops, no parent with assets). It runs on insert/update, so no screen or import can skip it.
3. Extend the existing delete safeguard so it also blocks deleting a category that still has subcategories.
4. Add the 6 parents and set the parent link on the 9 existing categories in every workspace. This is a data step, run separately after the change above.

Impact: no columns removed or renamed. No change to the assets, QR, transfer, service or import logic. Existing rows get an empty parent, which is valid. Everything can be undone by clearing the parent link.

## Technical details
- `category-schema.ts`: add `parentId` (uuid | null), plus helpers `wouldCreateCategoryCycle`, `categoryTree`, `assignableCategories`, `categoryPath`. Tests for: loops, depth limit, a parent with assets being rejected, grouping, and duplicate names across levels.
- `category.functions.ts`: accept `parentId` and check it on the server (same org, top-level, rules above). Map the database error to friendly messages.
- `categories.tsx`: tree table, parent picker, parent filter.
- `asset-form.tsx`: grouped select (only assignable categories).
- `workspace.tsx`: Parent category column and filter in the register; dashboard grouping.
- `asset-import.ts` / template: optional "Parent category" column; consistency check only. The import step in the database is unchanged because it never reads the parent.
- `dashboard-export.ts`: add a parent column.
- Not touched: QR generation/labels, public scan page, asset ID generation, transfers, service requests, QRmyCAR, ERP/SAP fields.
- Verification: unit tests, typecheck, and direct database tests (a loop, 3 levels, a cross-workspace parent and deleting a parent with children are all rejected). Signed-in browser run: categories tree, add a subcategory, create an asset, filter by parent, import an Excel file with and without the parent column. Confirm asset IDs and QR tokens are unchanged by comparing before and after.
