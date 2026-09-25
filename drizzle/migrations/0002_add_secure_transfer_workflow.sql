CREATE OR REPLACE FUNCTION public.process_asset_transfer(_transfer_id uuid, _action text)
RETURNS public.workflow_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _transfer public.asset_transfers%ROWTYPE;
  _next_status public.workflow_status;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO _transfer
  FROM public.asset_transfers
  WHERE id = _transfer_id
  FOR UPDATE;

  IF NOT FOUND OR NOT public.is_org_member(_transfer.organization_id) THEN
    RAISE EXCEPTION 'Transfer not found';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'asset_manager') OR
    public.has_role(auth.uid(), 'facility_manager') OR
    public.has_role(auth.uid(), 'it_manager')
  ) THEN
    RAISE EXCEPTION 'You do not have permission to process transfers';
  END IF;

  IF _action = 'approve' AND _transfer.status = 'pending' THEN
    _next_status := 'approved';
  ELSIF _action = 'reject' AND _transfer.status IN ('pending', 'approved') THEN
    _next_status := 'rejected';
  ELSIF _action = 'complete' AND _transfer.status IN ('pending', 'approved') THEN
    _next_status := 'completed';
  ELSE
    RAISE EXCEPTION 'This transfer action is not available in its current status';
  END IF;

  UPDATE public.asset_transfers
  SET status = _next_status,
      approved_by = CASE WHEN _next_status IN ('approved', 'completed') THEN auth.uid() ELSE approved_by END
  WHERE id = _transfer_id;

  IF _next_status = 'completed' THEN
    UPDATE public.assets
    SET location_id = COALESCE(_transfer.to_location_id, location_id),
        assigned_employee_id = _transfer.to_employee_id,
        status = CASE WHEN _transfer.to_employee_id IS NULL THEN 'in_stock'::public.asset_status ELSE 'assigned'::public.asset_status END,
        updated_by = auth.uid()
    WHERE id = _transfer.asset_id
      AND organization_id = _transfer.organization_id;

    UPDATE public.asset_assignments
    SET returned_at = now()
    WHERE asset_id = _transfer.asset_id
      AND organization_id = _transfer.organization_id
      AND returned_at IS NULL;

    INSERT INTO public.asset_assignments (
      organization_id, asset_id, employee_id, location_id, assignment_date, remarks, created_by
    ) VALUES (
      _transfer.organization_id, _transfer.asset_id, _transfer.to_employee_id,
      _transfer.to_location_id, _transfer.transfer_date, _transfer.remarks, auth.uid()
    );

    INSERT INTO public.asset_events (
      organization_id, asset_id, event_type, actor_id, summary, old_value, new_value
    ) VALUES (
      _transfer.organization_id, _transfer.asset_id, 'transfer_completed', auth.uid(),
      'Asset transfer completed',
      jsonb_build_object('location_id', _transfer.from_location_id, 'employee_id', _transfer.from_employee_id),
      jsonb_build_object('location_id', _transfer.to_location_id, 'employee_id', _transfer.to_employee_id)
    );
  END IF;

  RETURN _next_status;
END;
$$;

REVOKE ALL ON FUNCTION public.process_asset_transfer(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_asset_transfer(uuid, text) TO authenticated, service_role;