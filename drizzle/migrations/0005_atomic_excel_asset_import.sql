CREATE OR REPLACE FUNCTION public.import_asset_rows(_organization_id uuid, _rows jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE r jsonb; a public.assets%ROWTYPE; prefix_value text; next_number bigint; imported integer := 0;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_org_member(_organization_id) THEN RAISE EXCEPTION 'Workspace access required'; END IF;
 IF jsonb_typeof(_rows) <> 'array' OR jsonb_array_length(_rows) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Upload between 1 and 500 assets'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_organization_id::text, 0));
 FOR r IN SELECT value FROM jsonb_array_elements(_rows) LOOP
  SELECT * INTO a FROM jsonb_populate_record(NULL::public.assets, r);
  IF a.name IS NULL OR length(trim(a.name)) NOT BETWEEN 2 AND 120 OR a.category_id IS NULL OR a.status IS NULL OR a.condition IS NULL
   OR coalesce(length(a.serial_number),0)>100 OR coalesce(length(a.manufacturer),0)>100 OR coalesce(length(a.model),0)>100
   OR coalesce(length(a.plant),0)>100 OR coalesce(length(a.company_code),0)>50 OR coalesce(length(a.remarks),0)>1000
   OR a.purchase_value<0 OR a.purchase_value>999999999999 OR a.current_value<0 OR a.current_value>999999999999 THEN RAISE EXCEPTION 'Invalid asset details'; END IF;
  SELECT prefix INTO prefix_value FROM public.asset_categories WHERE id=a.category_id AND organization_id=_organization_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Category not in workspace'; END IF;
  IF a.location_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.locations WHERE id=a.location_id AND organization_id=_organization_id) THEN RAISE EXCEPTION 'Location not in workspace'; END IF;
  IF a.department_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.departments WHERE id=a.department_id AND organization_id=_organization_id) THEN RAISE EXCEPTION 'Department not in workspace'; END IF;
  IF a.assigned_employee_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.employees WHERE id=a.assigned_employee_id AND organization_id=_organization_id) THEN RAISE EXCEPTION 'Custodian not in workspace'; END IF;
  IF nullif(trim(a.serial_number),'') IS NOT NULL AND EXISTS(SELECT 1 FROM public.assets WHERE organization_id=_organization_id AND lower(trim(serial_number))=lower(trim(a.serial_number))) THEN RAISE EXCEPTION 'Serial number already registered'; END IF;
  SELECT coalesce(max(substring(asset_id from '([0-9]+)$')::bigint),0)+1 INTO next_number FROM public.assets WHERE organization_id=_organization_id AND category_id=a.category_id;
  a.id := gen_random_uuid();
  INSERT INTO public.assets(id,organization_id,asset_id,name,category_id,serial_number,manufacturer,model,plant,company_code,status,condition,location_id,department_id,assigned_employee_id,purchase_value,current_value,capitalization_date,warranty_end,remarks,created_by,updated_by)
  VALUES(a.id,_organization_id,prefix_value||'-'||lpad(next_number::text,6,'0'),trim(a.name),a.category_id,a.serial_number,a.manufacturer,a.model,a.plant,a.company_code,a.status,a.condition,a.location_id,a.department_id,a.assigned_employee_id,a.purchase_value,a.current_value,a.capitalization_date,a.warranty_end,a.remarks,auth.uid(),auth.uid());
  INSERT INTO public.asset_qr_codes(organization_id,asset_id,generated_by) VALUES(_organization_id,a.id,auth.uid());
  imported := imported+1;
 END LOOP;
 RETURN imported;
END; $$;
REVOKE ALL ON FUNCTION public.import_asset_rows(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.import_asset_rows(uuid,jsonb) TO authenticated;