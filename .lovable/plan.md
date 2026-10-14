# Employees module: create, edit, search, deactivate/reactivate

## What exists today (checked)
- The Employees tab shows read-only cards. Your workspace has 60 employees, all active.
- Each employee has a code, full name, email, mobile, designation, department, location, manager and status. Codes are already unique per organization in the database.
- What points at an employee:
  - Assets (assigned custodian) and other employees (manager). If an employee is deleted, these links are silently cleared.
  - Transfers (from/to) and assignment history. These links block deletion.
- Access rule: any workspace member can read and write their organization's employees. No role check yet.
- Employee lists are used by the asset form (custodian), transfer form (new custodian), Excel import (by employee code) and transfer history names.

## What you'll get
- A searchable table: Code, Name, Designation, Department, Location, Manager, Status, and a count of assigned assets. Search by code, name, email, designation or department; filter by status.
- Add and edit forms on the same page, styled like Categories and Locations. Fields: Code (required, 2–20 letters, digits or dashes, saved in uppercase), Full name (required, 2–100), Email (optional, valid format), Mobile (optional), Designation (optional), Department, Location, Manager (all optional), Status (Active / Inactive).
- **Deactivate instead of delete.** No delete button. Deactivate sets Inactive; Reactivate switches back. Asset assignments, transfers and history keep their links.
- Same managers as Locations can change employees: super admin, admin, asset manager, facility manager. Others see a read-only list.
- Success and error messages, loading states, and automatic refresh after every change.

## Server rules
- The organization always comes from the signed-in user's own role, never from the screen.
- Edits are limited to that employee's ID within that organization.
- Duplicate codes are checked first; a database duplicate also returns a clear message.
- Department, location and manager must belong to the same organization. An employee can't be their own manager or report to someone in their own reporting chain.
- An employee can't be deactivated while they are the custodian on an open (pending or approved) transfer. Assets still assigned to them stay assigned; the confirmation tells you how many.

## Inactive employees
- Hidden from new choices only: asset form custodian list, transfer form new-custodian list, manager list in the Employees form (each keeps the currently selected person visible when editing).
- Excel import: a row naming an inactive employee code is rejected with a clear message.
- Existing asset records, transfer history, reports and exports keep showing the name.

## Database change (needs your approval, applied first)
Same safeguard as Locations. The screen offers no delete, but the current access rule still allows a hard delete from outside the app, which would silently clear asset custodians and manager links. One rule will refuse deleting an employee still used by assets, other employees (as manager), transfers or assignments, with the message "Employee is used by other records". No tables, columns, links, access rules or data change.

```sql
create function public.prevent_referenced_employee_delete() returns trigger
language plpgsql set search_path = public as $$
begin
  if exists (select 1 from public.assets where assigned_employee_id = old.id)
  or exists (select 1 from public.employees where manager_id = old.id)
  or exists (select 1 from public.asset_transfers where from_employee_id = old.id or to_employee_id = old.id)
  or exists (select 1 from public.asset_assignments where employee_id = old.id) then
    raise exception 'Employee is used by other records' using errcode = '23503';
  end if;
  return old;
end $$;
revoke all on function public.prevent_referenced_employee_delete() from public, anon, authenticated;
create trigger employees_block_referenced_delete before delete on public.employees
for each row execute function public.prevent_referenced_employee_delete();
```

## Not changed
Locations, Categories, QRmyCAR, SAP/API integrations, asset/transfer/import logic beyond the one-line inactive filters above.

## Testing
- Unit tests: code format, duplicate codes, manager loops, deactivation check, inactive filtering.
- Run with the project's test runner (bun test) and report real results.
- Signed-in browser check: add, edit, duplicate rejected, deactivate/reactivate, persists after reload.
- Database check that deleting an employee in use fails with 23503.

## Technical details
- New: `src/lib/employee-schema.ts` (+ test), `src/lib/employee.functions.ts` (createEmployee, updateEmployee, setEmployeeStatus with requireSupabaseAuth), `src/components/asset360/employees.tsx`.
- `workspace.tsx`: render `<Employees data={data}/>` on the employees tab; hide dummy PageActions there.
- `asset360.functions.ts`: add email, mobile, department_id, location_id, manager_id to the employees select.
- Reuse a `selectableEmployees(list, keepId)` helper in asset-form, transfer-form and asset-import lookup.
- AGENTS.md: merge into the existing master-data rule. roadmap.md: Employees task.
