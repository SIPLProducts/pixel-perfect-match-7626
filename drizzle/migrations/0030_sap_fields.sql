ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS sap_fields jsonb;

CREATE OR REPLACE FUNCTION public.sync_sap_asset_rows(_organization_id uuid, _rows jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE inserted integer := 0; updated integer := 0; skipped integer := 0; total integer;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_org_admin(_organization_id) THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 IF _rows IS NULL OR jsonb_typeof(_rows) <> 'array' OR jsonb_array_length(_rows) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Sync between 1 and 500 assets'; END IF;
 total := jsonb_array_length(_rows);
 CREATE TEMP TABLE _sap ON COMMIT DROP AS
 SELECT DISTINCT ON (r.asset_id) r.* FROM jsonb_to_recordset(_rows) AS r(
  asset_id text, name text, plant text, company_code text, purchase_value numeric, current_value numeric,
  capitalization_date date, cost_center text, supplier text, quantity numeric, base_unit text, erp_location text,
  wbs_element text, planned_life text, depreciation_key text, depreciation_start_date date, external_asset_number text,
  asset_subnumber text, currency text, accumulated_depreciation numeric, special_depreciation numeric, planned_depreciation numeric, subcategory text, sap_fields jsonb)
 WHERE r.asset_id IS NOT NULL AND length(trim(r.asset_id)) BETWEEN 1 AND 60;
 SELECT count(*) INTO skipped FROM _sap s JOIN public.assets a ON a.organization_id=_organization_id AND a.asset_id=s.asset_id AND a.source<>'sap';
 WITH up AS (
  INSERT INTO public.assets AS a (organization_id, source, asset_id, name, plant, company_code, purchase_value, current_value, capitalization_date, cost_center, supplier, quantity, base_unit, erp_location, wbs_element, planned_life, depreciation_key, depreciation_start_date, external_asset_number, asset_subnumber, currency, accumulated_depreciation, special_depreciation, planned_depreciation, subcategory, sap_fields, created_by, updated_by)
  SELECT _organization_id, 'sap', s.asset_id, left(coalesce(nullif(trim(s.name),''), s.asset_id),120), s.plant, s.company_code, s.purchase_value, s.current_value, s.capitalization_date, s.cost_center, s.supplier, s.quantity, s.base_unit, s.erp_location, s.wbs_element, s.planned_life, s.depreciation_key, s.depreciation_start_date, s.external_asset_number, s.asset_subnumber, s.currency, s.accumulated_depreciation, s.special_depreciation, s.planned_depreciation, s.subcategory, s.sap_fields, auth.uid(), auth.uid()
  FROM _sap s
  ON CONFLICT (organization_id, asset_id) DO UPDATE SET
   name=EXCLUDED.name, plant=EXCLUDED.plant, company_code=EXCLUDED.company_code, purchase_value=EXCLUDED.purchase_value, current_value=EXCLUDED.current_value,
   capitalization_date=EXCLUDED.capitalization_date, cost_center=EXCLUDED.cost_center, supplier=EXCLUDED.supplier, quantity=EXCLUDED.quantity, base_unit=EXCLUDED.base_unit,
   erp_location=EXCLUDED.erp_location, wbs_element=EXCLUDED.wbs_element, planned_life=EXCLUDED.planned_life, depreciation_key=EXCLUDED.depreciation_key,
   depreciation_start_date=EXCLUDED.depreciation_start_date, external_asset_number=EXCLUDED.external_asset_number, asset_subnumber=EXCLUDED.asset_subnumber,
   currency=EXCLUDED.currency, accumulated_depreciation=EXCLUDED.accumulated_depreciation, special_depreciation=EXCLUDED.special_depreciation,
   planned_depreciation=EXCLUDED.planned_depreciation, subcategory=EXCLUDED.subcategory, sap_fields=EXCLUDED.sap_fields, updated_by=auth.uid(), updated_at=now()
  WHERE a.source='sap'
  RETURNING (xmax = 0) AS is_new, a.id
 ), qr AS (
  INSERT INTO public.asset_qr_codes (organization_id, asset_id, generated_by)
  SELECT _organization_id, id, auth.uid() FROM up ON CONFLICT (asset_id) DO NOTHING RETURNING 1
 )
 SELECT count(*) FILTER (WHERE is_new), count(*) FILTER (WHERE NOT is_new) INTO inserted, updated FROM up;
 RETURN jsonb_build_object('inserted', inserted, 'updated', updated, 'skipped', skipped + (total - inserted - updated - skipped));
END $$;
REVOKE ALL ON FUNCTION public.sync_sap_asset_rows(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_sap_asset_rows(uuid,jsonb) TO authenticated;