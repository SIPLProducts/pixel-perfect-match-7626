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
- Inactive locations stay visible in existing records and are hidden only from new choices. Details are in the "Inactive locations" section below.
- Only super admin, admin, asset manager and facility manager can add, edit or deactivate. Other users see the list read-only.
- Success and error messages, loading states, and an automatic refresh after every change.

## Server rules
- The organization always comes from the signed-in user's own role, never from the screen.
- Every edit is limited to that location's ID within that organization.
- Duplicate codes are checked first. If the database still reports a duplicate, you get a clear message.
- The parent must belong to the same organization. A location can't be its own parent or sit under one of its own children: the server walks up the parent chain to check.
- A location can't be deactivated while it has active child locations or an open (pending or approved) transfer to it. The message explains what to do first.

## Database change (approved by you, applied first)
The screen offers no delete, but the current access rule still lets any member hard-delete a location from outside the app. Today that would silently clear the links on assets, departments, employees and child locations.

**Confirmation 1:** I'll add one rule that runs before any location is deleted. It refuses the delete with the message "Location is used by other records" if any of these still point at the location:
- assets
- departments
- employees
- child locations
- transfers (either from or to the location)
- assignments
- verification records

The rule checks every row, after the database has locked the location, so a record saved at the same moment is also caught. Locations that nothing uses can still be deleted. Nothing else changes: no tables, columns, links or access rules, and no existing data.

```sql
create function public.prevent_referenced_location_delete() returns trigger
language plpgsql set search_path = public as $$
begin
  if exists (select 1 from public.assets where location_id = old.id)
  or exists (select 1 from public.departments where location_id = old.id)
  or exists (select 1 from public.employees where location_id = old.id)
  or exists (select 1 from public.locations where parent_id = old.id)
  or exists (select 1 from public.asset_transfers where from_location_id = old.id or to_location_id = old.id)
  or exists (select 1 from public.asset_assignments where location_id = old.id)
  or exists (select 1 from public.asset_verifications where confirmed_location_id = old.id) then
    raise exception 'Location is used by other records' using errcode = '23503';
  end if;
  return old;
end $$;
revoke all on function public.prevent_referenced_location_delete() from public, anon, authenticated;
create trigger locations_block_referenced_delete before delete on public.locations
for each row execute function public.prevent_referenced_location_delete();
```

## Inactive locations (confirmation 2)
Inactive locations are hidden from new choices only:
- **Asset form (add or edit):** the location list shows active locations, plus the asset's current location if it is inactive, so saving an edit never drops it.
- **Transfer form:** the destination list shows active locations, plus the current destination when you edit an existing transfer.
- **Excel import:** a row naming an inactive location is rejected with a clear message. Saved assets are not affected.
- **Locations form:** an inactive location can't be chosen as a new parent.

Inactive locations still display everywhere they are already used, because those screens read the saved link and not the active list:
- the asset register, asset details and current-location columns
- transfer from/to, transfer history and latest-transfer columns
- dashboard and register filters, reports and exports

The only changes to the asset form, transfer form and Excel import are these one-line list filters. Their other logic stays the same.

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
- Shared helper `selectableLocations(locations, keepId?)` in `location-schema.ts`, with tests. It is used by the asset form, the transfer form and the Excel import location lookup (the lookup reports a row error for an inactive location).
- The migration above is applied through the migration tool, then checked directly: deleting a location that is in use fails with 23503.
- AGENTS.md: one rule for Locations. roadmap.md: the Locations task and these two confirmations.
