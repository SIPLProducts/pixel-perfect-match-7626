ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS photo_path text;
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'portal';
CREATE POLICY "Workspace members read breakdown photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'breakdown-photos' AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.organization_id::text = split_part(name, '/', 1)));
CREATE OR REPLACE FUNCTION public.submit_qr_breakdown(_token uuid, _title text, _remarks text, _photo_path text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.assets%ROWTYPE; request_id uuid := gen_random_uuid();
BEGIN
 SELECT assets.* INTO a FROM public.asset_qr_codes q JOIN public.assets ON assets.id = q.asset_id AND assets.organization_id = q.organization_id WHERE q.token = _token AND q.active;
 IF NOT FOUND THEN RAISE EXCEPTION 'Asset label unavailable'; END IF;
 IF length(trim(_title)) NOT BETWEEN 3 AND 160 OR length(trim(_remarks)) NOT BETWEEN 10 AND 2000 THEN RAISE EXCEPTION 'Enter breakdown details'; END IF;
 IF _photo_path IS NOT NULL AND (_photo_path NOT LIKE a.organization_id::text || '/' || a.id::text || '/%' OR NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'breakdown-photos' AND name = _photo_path)) THEN RAISE EXCEPTION 'Invalid breakdown photo'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(a.id::text, 0));
 IF (SELECT count(*) FROM public.maintenance_requests WHERE asset_id = a.id AND source = 'qr' AND created_at > now() - interval '1 hour') >= 10 THEN RAISE EXCEPTION 'Too many reports for this asset. Please try later'; END IF;
 INSERT INTO public.maintenance_requests(id, organization_id, asset_id, maintenance_type, title, remarks, status, cost, start_date, photo_path, source) VALUES(request_id, a.organization_id, a.id, 'breakdown', trim(_title), trim(_remarks), 'pending', 0, current_date, _photo_path, 'qr');
 INSERT INTO public.asset_events(organization_id, asset_id, event_type, summary, metadata) VALUES(a.organization_id, a.id, 'breakdown_reported', 'Breakdown reported from asset QR label', jsonb_build_object('request_id', request_id));
 RETURN request_id;
END; $$;
REVOKE ALL ON FUNCTION public.submit_qr_breakdown(uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_qr_breakdown(uuid,text,text,text) TO service_role;