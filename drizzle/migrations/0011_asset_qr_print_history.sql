CREATE TABLE public.asset_qr_prints (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 operation_id uuid NOT NULL,
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
 action text NOT NULL CHECK (action IN ('print','pdf','png')),
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (operation_id, asset_id)
);
GRANT SELECT ON public.asset_qr_prints TO authenticated;
GRANT ALL ON public.asset_qr_prints TO service_role;
ALTER TABLE public.asset_qr_prints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read QR print history" ON public.asset_qr_prints FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE INDEX asset_qr_prints_org_asset_idx ON public.asset_qr_prints(organization_id, asset_id);
CREATE OR REPLACE FUNCTION public.record_asset_qr_prints(_operation_id uuid, _asset_ids uuid[], _action text) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE matched integer; expected integer; inserted integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF _operation_id IS NULL OR _action IS NULL OR _action NOT IN ('print','pdf','png') OR coalesce(cardinality(_asset_ids),0) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Invalid label operation'; END IF;
 SELECT count(DISTINCT id) INTO expected FROM unnest(_asset_ids) AS ids(id);
 IF expected <> cardinality(_asset_ids) THEN RAISE EXCEPTION 'Duplicate or invalid assets'; END IF;
 SELECT count(*) INTO matched FROM public.assets a WHERE a.id = ANY(_asset_ids) AND public.is_org_member(a.organization_id) AND EXISTS (SELECT 1 FROM public.asset_qr_codes q WHERE q.asset_id=a.id AND q.organization_id=a.organization_id AND q.active);
 IF matched <> expected THEN RAISE EXCEPTION 'Asset not available in your workspace'; END IF;
 IF EXISTS (SELECT 1 FROM public.asset_qr_prints p WHERE p.operation_id = _operation_id AND (p.created_by <> auth.uid() OR p.action <> _action)) THEN RAISE EXCEPTION 'Invalid operation identity'; END IF;
 INSERT INTO public.asset_qr_prints(operation_id, organization_id, asset_id, action, created_by)
 SELECT _operation_id, a.organization_id, a.id, _action, auth.uid() FROM public.assets a WHERE a.id = ANY(_asset_ids)
 ON CONFLICT(operation_id,asset_id) DO NOTHING;
 GET DIAGNOSTICS inserted = ROW_COUNT;
 RETURN inserted;
END; $$;
REVOKE ALL ON FUNCTION public.record_asset_qr_prints(uuid, uuid[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_asset_qr_prints(uuid, uuid[], text) TO authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE public.asset_qr_prints;
COMMENT ON TABLE public.asset_qr_prints IS 'Immutable QR label output history; print, PDF and PNG actions count once per asset per operation. Physical printer completion is not observable.';