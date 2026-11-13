CREATE OR REPLACE FUNCTION public.is_org_admin(_organization_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND organization_id = _organization_id AND active AND role IN ('super_admin','admin'))
$$;

CREATE TABLE public.sap_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  module text NOT NULL DEFAULT 'COMMON' CHECK (module IN ('MM','SD','COMMON')),
  path text NOT NULL,
  method text NOT NULL DEFAULT 'GET' CHECK (method IN ('GET','POST','PUT','DELETE')),
  auth_type text NOT NULL DEFAULT 'basic' CHECK (auth_type IN ('basic','proxy','none','oauth')),
  api_type text NOT NULL DEFAULT 'fetch' CHECK (api_type IN ('fetch','sync')),
  active boolean NOT NULL DEFAULT true,
  request_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  response_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  extra_headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  credential_user text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sap_endpoints TO authenticated;
GRANT ALL ON public.sap_endpoints TO service_role;
ALTER TABLE public.sap_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage sap endpoints" ON public.sap_endpoints FOR ALL TO authenticated USING (public.is_org_admin(organization_id)) WITH CHECK (public.is_org_admin(organization_id));
CREATE TRIGGER sap_endpoints_updated BEFORE UPDATE ON public.sap_endpoints FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.sap_connection_settings (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id),
  environment text NOT NULL DEFAULT 'Development',
  base_url text NOT NULL DEFAULT '',
  technical_user text NOT NULL DEFAULT '',
  connection_mode text NOT NULL DEFAULT 'direct' CHECK (connection_mode IN ('direct','proxy')),
  deployment_mode text NOT NULL DEFAULT 'self_hosted' CHECK (deployment_mode IN ('cloud','self_hosted')),
  middleware_url text NOT NULL DEFAULT '',
  middleware_port integer NOT NULL DEFAULT 3002,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.sap_connection_settings TO authenticated;
GRANT ALL ON public.sap_connection_settings TO service_role;
ALTER TABLE public.sap_connection_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage sap connection" ON public.sap_connection_settings FOR ALL TO authenticated USING (public.is_org_admin(organization_id)) WITH CHECK (public.is_org_admin(organization_id));

CREATE TABLE public.sap_secrets (
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  scope text NOT NULL,
  secret text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, scope)
);
GRANT ALL ON public.sap_secrets TO service_role;
ALTER TABLE public.sap_secrets ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.sap_test_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  endpoint_id uuid REFERENCES public.sap_endpoints(id) ON DELETE CASCADE,
  target text NOT NULL,
  status integer,
  latency_ms integer,
  message text NOT NULL DEFAULT '',
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sap_test_logs TO authenticated;
GRANT ALL ON public.sap_test_logs TO service_role;
ALTER TABLE public.sap_test_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read sap tests" ON public.sap_test_logs FOR SELECT TO authenticated USING (public.is_org_admin(organization_id));
CREATE POLICY "admins add sap tests" ON public.sap_test_logs FOR INSERT TO authenticated WITH CHECK (public.is_org_admin(organization_id) AND actor_id = auth.uid());

CREATE TABLE public.sap_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  changed_fields text[] NOT NULL DEFAULT '{}',
  actor_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sap_audit_log TO authenticated;
GRANT ALL ON public.sap_audit_log TO service_role;
ALTER TABLE public.sap_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read sap audit" ON public.sap_audit_log FOR SELECT TO authenticated USING (public.is_org_admin(organization_id));
CREATE POLICY "admins add sap audit" ON public.sap_audit_log FOR INSERT TO authenticated WITH CHECK (public.is_org_admin(organization_id) AND actor_id = auth.uid());