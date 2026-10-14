# Categories module

## What you will see
- Categories page: search box (name, prefix, description), table with Name, Prefix, Description, Assets using it, Actions (Edit, Delete), result count, empty state.
- "Add category" button in the page header opens an inline form (same style as the asset form): Name, Prefix, Description, Save / Cancel, spinner while saving.
- Edit opens the same inline form prefilled. A note warns that changing the prefix only affects new asset IDs; existing asset IDs and QR labels never change.
- Delete asks for confirmation. If any asset uses the category, Delete is disabled with "Used by N assets" and the server also refuses.
- Success and error toasts; the table updates live in all open sessions.
- Viewers/employees see the table read-only (no Add/Edit/Delete).

## Rules
- Name: required, 2-60 chars, unique per workspace (case-insensitive).
- Prefix: required, 2-6 uppercase letters/digits (input auto-uppercases), unique per workspace. Matches the existing database check.
- Description: optional, up to 500 chars.
- Allowed roles: super_admin, admin, asset_manager.

## Technical details
Current state (verified): `asset_categories` has unique (organization_id, name), unique (organization_id, prefix), prefix check `^[A-Z0-9]{2,6}$`; `assets.category_id` references it with ON DELETE SET NULL, so the database itself would silently unlink assets — the delete block must be enforced in server code. RLS is org-membership only, so role checks happen in the server functions.

New files
- `src/lib/category-schema.ts` — zod schema, `categoryRoles`, `normalizePrefix`, duplicate helper.
- `src/lib/category-schema.test.ts` — prefix format, required fields, case-insensitive duplicate detection, role allow-list.
- `src/lib/category.functions.ts` — `createCategory`, `updateCategory`, `deleteCategory` (requireSupabaseAuth; membership + role from `user_roles`; organization_id always from server membership, never client; edit/delete filter by id AND organization_id; duplicate pre-check plus mapping of unique-violation 23505 to friendly messages; delete counts referencing assets in the org and refuses if > 0, then deletes with org filter).
- `src/components/asset360/categories.tsx` — table, search, inline form, delete AlertDialog, useMutation + invalidate `["workspace"]`.

Edited
- `src/components/asset360/workspace.tsx` — render `<Categories data={data}/>` for the categories tab and hide the generic header action there. Nothing else changes.
- `AGENTS.md`, `roadmap.md` — one rule each.

No database changes. Known small residual race: an asset created in the same instant as a delete could be unlinked by the existing SET NULL rule; closing it fully would need a database guard, which I'll only add if you approve.

Testing: bun tests above; Playwright signed-in run — add, duplicate name/prefix rejected, bad prefix rejected, edit, delete blocked for a used category, delete of an unused category succeeds, search; confirm asset form category list, Excel import and existing asset IDs are unchanged. Temporary test categories removed afterwards.
