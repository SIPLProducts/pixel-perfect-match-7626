CREATE TABLE public.category_templates (
  category_id uuid PRIMARY KEY REFERENCES public.asset_categories(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  template_key text NOT NULL CHECK (template_key IN ('it_computer','plant_machinery')),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX category_templates_org_idx ON public.category_templates(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_templates TO authenticated;
GRANT ALL ON public.category_templates TO service_role;
ALTER TABLE public.category_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read category templates" ON public.category_templates FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "managers write category templates" ON public.category_templates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.organization_id = category_templates.organization_id AND r.role IN ('super_admin','admin','asset_manager','it_manager','facility_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.organization_id = category_templates.organization_id AND r.role IN ('super_admin','admin','asset_manager','it_manager','facility_manager'))
    AND EXISTS (SELECT 1 FROM public.asset_categories c WHERE c.id = category_id AND c.organization_id = category_templates.organization_id));