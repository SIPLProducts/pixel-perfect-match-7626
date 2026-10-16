DROP POLICY "managers write category templates" ON public.category_templates;
CREATE POLICY "managers write category templates" ON public.category_templates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.organization_id = category_templates.organization_id AND r.role IN ('super_admin','admin','asset_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.organization_id = category_templates.organization_id AND r.role IN ('super_admin','admin','asset_manager'))
    AND EXISTS (SELECT 1 FROM public.asset_categories c WHERE c.id = category_id AND c.organization_id = category_templates.organization_id));