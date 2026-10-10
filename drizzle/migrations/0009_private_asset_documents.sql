CREATE TABLE public.asset_attachments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
 document_type text NOT NULL CHECK (document_type IN ('warranty','manual','drawing')),
 file_name text NOT NULL,
 storage_path text NOT NULL UNIQUE,
 content_type text NOT NULL,
 file_size bigint NOT NULL CHECK (file_size > 0 AND file_size <= 20971520),
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.asset_attachments TO authenticated;
GRANT ALL ON public.asset_attachments TO service_role;
ALTER TABLE public.asset_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY asset_documents_read ON public.asset_attachments FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY asset_documents_add ON public.asset_attachments FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.assets a WHERE a.id = asset_attachments.asset_id AND a.organization_id = asset_attachments.organization_id) AND storage_path = organization_id::text || '/' || asset_id::text || '/' || id::text);
CREATE INDEX asset_attachments_asset_idx ON public.asset_attachments (asset_id);
CREATE POLICY asset_document_storage_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'asset-documents' AND EXISTS (SELECT 1 FROM public.assets a WHERE a.organization_id::text = (storage.foldername(name))[1] AND a.id::text = (storage.foldername(name))[2] AND public.is_org_member(a.organization_id)));
CREATE POLICY asset_document_storage_add ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'asset-documents' AND EXISTS (SELECT 1 FROM public.assets a WHERE a.organization_id::text = (storage.foldername(name))[1] AND a.id::text = (storage.foldername(name))[2] AND public.is_org_member(a.organization_id)));
CREATE POLICY asset_document_storage_cleanup ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'asset-documents' AND owner_id::text = auth.uid()::text AND NOT EXISTS (SELECT 1 FROM public.asset_attachments d WHERE d.storage_path = storage.objects.name) AND EXISTS (SELECT 1 FROM public.assets a WHERE a.organization_id::text = (storage.foldername(name))[1] AND a.id::text = (storage.foldername(name))[2] AND public.is_org_member(a.organization_id)));
ALTER PUBLICATION supabase_realtime ADD TABLE public.asset_attachments;