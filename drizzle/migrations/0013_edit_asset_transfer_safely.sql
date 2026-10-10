CREATE OR REPLACE FUNCTION public.edit_asset_transfer(_transfer_id uuid, _expected_updated_at timestamptz, _to_location_id uuid, _to_employee_id uuid, _transfer_date date, _reason text, _remarks text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE t public.asset_transfers%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO t FROM public.asset_transfers WHERE id=_transfer_id FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND organization_id=t.organization_id AND role IN ('super_admin','admin','asset_manager','facility_manager','it_manager')) THEN RAISE EXCEPTION 'Transfer unavailable or permission denied'; END IF;
 IF t.updated_at IS DISTINCT FROM _expected_updated_at THEN RAISE EXCEPTION 'This transfer has changed. Close the editor and reopen the refreshed transfer.'; END IF;
 IF t.status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'Only pending or approved transfers can be edited'; END IF;
 IF _transfer_date IS NULL OR _reason IS NULL OR length(trim(_reason)) NOT BETWEEN 3 AND 200 OR coalesce(length(_remarks),0)>1000 THEN RAISE EXCEPTION 'Check the transfer details'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.locations WHERE id=_to_location_id AND organization_id=t.organization_id) THEN RAISE EXCEPTION 'Destination not in workspace'; END IF;
 IF _to_employee_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.employees WHERE id=_to_employee_id AND organization_id=t.organization_id) THEN RAISE EXCEPTION 'Custodian not in workspace'; END IF;
 IF t.from_location_id IS NOT DISTINCT FROM _to_location_id AND t.from_employee_id IS NOT DISTINCT FROM _to_employee_id THEN RAISE EXCEPTION 'Choose a different location or custodian'; END IF;
 UPDATE public.asset_transfers SET to_location_id=_to_location_id,to_employee_id=_to_employee_id,transfer_date=_transfer_date,reason=trim(_reason),remarks=nullif(trim(_remarks),''),status='pending',approved_by=NULL WHERE id=t.id;
 INSERT INTO public.asset_events(organization_id,asset_id,event_type,actor_id,summary,old_value,new_value,metadata)
 VALUES(t.organization_id,t.asset_id,'transfer_updated',auth.uid(),'Transfer details updated',jsonb_build_object('status',t.status,'to_location_id',t.to_location_id,'to_employee_id',t.to_employee_id,'reason',t.reason,'transfer_date',t.transfer_date),jsonb_build_object('status','pending','to_location_id',_to_location_id,'to_employee_id',_to_employee_id,'reason',trim(_reason),'transfer_date',_transfer_date),jsonb_build_object('transfer_id',t.id));
 RETURN t.id;
END; $$;
REVOKE ALL ON FUNCTION public.edit_asset_transfer(uuid,timestamptz,uuid,uuid,date,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edit_asset_transfer(uuid,timestamptz,uuid,uuid,date,text,text) TO authenticated;