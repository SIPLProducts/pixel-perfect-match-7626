CREATE TABLE public.category_hierarchy_snapshot AS
SELECT a.id AS asset_row_id, a.organization_id, a.asset_id, a.category_id, q.token AS qr_token, now() AS taken_at
FROM public.assets a LEFT JOIN public.asset_qr_codes q ON q.asset_id=a.id AND q.active;
GRANT ALL ON public.category_hierarchy_snapshot TO service_role;
ALTER TABLE public.category_hierarchy_snapshot ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.category_hierarchy_snapshot IS 'Backup taken before parent categories were introduced; used for rollback verification only.';

ALTER TABLE public.asset_categories ADD COLUMN parent_id uuid REFERENCES public.asset_categories(id) ON DELETE RESTRICT;
CREATE INDEX asset_categories_parent_idx ON public.asset_categories(parent_id);

CREATE FUNCTION public.validate_category_parent() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE p public.asset_categories%ROWTYPE;
BEGIN
  IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.parent_id = NEW.id THEN RAISE EXCEPTION 'A category cannot be its own parent' USING errcode='23514'; END IF;
  SELECT * INTO p FROM public.asset_categories WHERE id=NEW.parent_id FOR SHARE;
  IF NOT FOUND OR p.organization_id <> NEW.organization_id THEN RAISE EXCEPTION 'Parent category not in workspace' USING errcode='23514'; END IF;
  IF p.parent_id IS NOT NULL THEN RAISE EXCEPTION 'Parent category must be top-level' USING errcode='23514'; END IF;
  IF EXISTS (SELECT 1 FROM public.asset_categories WHERE parent_id=NEW.id) THEN RAISE EXCEPTION 'A category with subcategories cannot become a subcategory' USING errcode='23514'; END IF;
  IF EXISTS (SELECT 1 FROM public.assets WHERE category_id=NEW.parent_id) THEN RAISE EXCEPTION 'Parent category is used by assets' USING errcode='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER asset_categories_validate_parent BEFORE INSERT OR UPDATE OF parent_id ON public.asset_categories
FOR EACH ROW EXECUTE FUNCTION public.validate_category_parent();

CREATE FUNCTION public.prevent_asset_on_parent_category() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.category_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.asset_categories WHERE parent_id=NEW.category_id) THEN
    RAISE EXCEPTION 'Assets must use a subcategory, not a parent category' USING errcode='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER assets_block_parent_category BEFORE INSERT OR UPDATE OF category_id ON public.assets
FOR EACH ROW EXECUTE FUNCTION public.prevent_asset_on_parent_category();

CREATE OR REPLACE FUNCTION public.prevent_used_category_delete() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
begin
  if exists (select 1 from public.assets where category_id = old.id) then
    raise exception 'Category is used by assets' using errcode = '23503';
  end if;
  if exists (select 1 from public.asset_categories where parent_id = old.id) then
    raise exception 'Category has subcategories' using errcode = '23503';
  end if;
  return old;
end $$;