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