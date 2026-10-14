create or replace function public.prevent_used_category_delete() returns trigger
language plpgsql set search_path = public as $$
begin
  if exists (select 1 from public.assets where category_id = old.id) then
    raise exception 'Category is used by assets' using errcode = '23503';
  end if;
  return old;
end $$;
revoke all on function public.prevent_used_category_delete() from public, anon, authenticated;
create trigger asset_categories_block_used_delete
before delete on public.asset_categories
for each row execute function public.prevent_used_category_delete();