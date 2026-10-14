# Locations module: add, edit and deactivate

## What exists today (checked)
- The Locations tab shows read-only cards. Your workspace has 15 locations, and all of them are active.
- Each location has a code, name, type, optional parent location and status. Codes must be unique within the organization, and type must be one of company, business unit, plant, building, floor, room or area. Status is free text and has no fixed list of values.
- What points at a location:
  - Assets, departments, employees and child locations. If a location is deleted, these links are silently cleared.
  - Transfers (from/to), assignment history and verification records. These links block deletion.
- Access rule: any workspace member can read and write their own organization's locations. There's no role check yet.
- Location lists are already shared by the asset form, transfer form, Excel import, dashboard filters and reports.

## What you'll get
- A searchable table showing Code, Name, Type, Parent location and Status, plus a count of assets and child locations. You can search by code, name, type or parent, and filter by status.
- Add and edit forms on the same page, styled like the Categories page. Fields: Code (required, 2 to 20 letters, digits or dashes, saved in uppercase), Name (required, 2 to 100 characters), Type (required), Parent (optional) and Status (Active or Inactive).
- **Deactivate instead of delete.** There's no hard delete. A Deactivate button sets the location to Inactive, and Reactivate switches it back. Assets, child locations, transfers and history all keep their links.
- Inactive locations stay visible in existing records. They're hidden only from new choices in the asset and transfer forms. That filter lives in the Locations-owned list, not in those forms' logic. The forms themselves stay unchanged: they keep showing whatever list they get. If you'd rather leave them fully untouched, I'll skip this step.
- Only super admin, admin, asset manager and facility manager can add, edit or deactivate. Other users see the list read-only.
- Success and error messages, loading states, and an automatic refresh after every change.

## Server rules
- The organization always comes from the signed-in user's own role, never from the screen.
- Every edit is limited to that location's ID within that organization.
- Duplicate codes are checked first. If the database still reports a duplicate, you get a clear message.
- The parent must belong to the same organization. A location can't be its own parent or sit under one of its own children: the server walks up the parent chain to check.
- A location can't be deactivated while it has active child locations or an open (pending or approved) transfer to it. The message explains what to do first.

## Proposed database change (needs your OK)
Even though the screen offers no delete, the current access rule still lets any member hard-delete a location from outside the app. That would silently unlink assets and child locations. I propose one small safeguard, like the one on Categories: a rule that refuses to delete a location that assets, departments, employees, child locations, transfers, assignments or verifications still use. There are no table, column or access-rule changes. If you decline, I'll skip it and rely on the server rules only.

## Not changed
Employees, Categories, asset/transfer/import logic, reports and QR workflows.

## Testing
- Unit tests for the rules: code format, duplicate codes, circular parents, and the deactivation checks.
- I'll run them with the project's test runner and report the real results.
- A signed-in browser check: add, edit, a duplicate code rejected, a circular parent rejected, deactivate and reactivate, and the result after a reload.
- A database check that the delete safeguard rejects a location still in use.

## Technical details
- New files:
  - `src/lib/location-schema.ts`: zod schemas, `locationRoles`, `normalizeCode`, `wouldCreateCycle`, `locationConflict`.
  - `src/lib/location-schema.test.ts`.
  - `src/lib/location.functions.ts`: `createLocation`, `updateLocation` and `setLocationStatus`, all using `requireSupabaseAuth`.
  - `src/components/asset360/locations.tsx`.
- `workspace.tsx`: render `<Locations data={data}/>` on the locations tab and hide the dummy PageActions there.
- `asset360.functions.ts`: add `parent_id,status` to the locations select.
- Optional migration: a BEFORE DELETE trigger, `locations_block_referenced_delete`, raising 23503; its function is revoked from public, anon and authenticated.
- AGENTS.md: one rule for Locations.
