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