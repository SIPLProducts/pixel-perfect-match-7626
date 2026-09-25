CREATE TYPE public.app_role AS ENUM ('super_admin','admin','asset_manager','finance','it_manager','facility_manager','auditor','employee','viewer');
CREATE TYPE public.asset_status AS ENUM ('active','in_stock','assigned','under_maintenance','under_repair','missing','damaged','retired','disposed');
CREATE TYPE public.asset_condition AS ENUM ('new','good','average','poor','damaged');
CREATE TYPE public.workflow_status AS ENUM ('draft','pending','approved','rejected','completed','cancelled');

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120), slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{2,80}$'), mode text NOT NULL DEFAULT 'standalone' CHECK (mode IN ('standalone','integrated')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY, organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL, full_name text NOT NULL DEFAULT '', avatar_url text, job_title text, preferences jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE, role public.app_role NOT NULL DEFAULT 'viewer', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id, organization_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_org_member(_organization_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND organization_id=_organization_id) $$;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE POLICY "Members view organizations" ON public.organizations FOR SELECT TO authenticated USING (public.is_org_member(id));
CREATE POLICY "Users create organizations" ON public.organizations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins update organizations" ON public.organizations FOR UPDATE TO authenticated USING (public.is_org_member(id));
CREATE POLICY "Users manage own profile" ON public.profiles FOR ALL TO authenticated USING (id=auth.uid()) WITH CHECK (id=auth.uid());
CREATE POLICY "Members view profiles" ON public.profiles FOR SELECT TO authenticated USING (organization_id IS NOT NULL AND public.is_org_member(organization_id));
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id=auth.uid());

CREATE TABLE public.asset_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE, name text NOT NULL, prefix text NOT NULL CHECK (prefix ~ '^[A-Z0-9]{2,6}$'), description text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id,name), UNIQUE(organization_id,prefix)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_categories TO authenticated;
GRANT ALL ON public.asset_categories TO service_role;
ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant access categories" ON public.asset_categories FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE, parent_id uuid REFERENCES public.locations(id) ON DELETE SET NULL, code text NOT NULL, name text NOT NULL, type text NOT NULL CHECK (type IN ('company','business_unit','plant','building','floor','room','area')), status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id,code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant access locations" ON public.locations FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE, location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL, code text NOT NULL, name text NOT NULL, manager_name text, cost_center text, status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id,code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant access departments" ON public.departments FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE, department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL, location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL, manager_id uuid REFERENCES public.employees(id) ON DELETE SET NULL, employee_code text NOT NULL, full_name text NOT NULL, email text, mobile text, designation text, status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id,employee_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant access employees" ON public.employees FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE, category_id uuid REFERENCES public.asset_categories(id) ON DELETE SET NULL, location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL, department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL, assigned_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL, asset_id text NOT NULL, name text NOT NULL, subcategory text, asset_type text, description text, manufacturer text, model text, serial_number text, purchase_date date, capitalization_date date, purchase_value numeric(14,2), current_value numeric(14,2), warranty_start date, warranty_end date, supplier text, invoice_number text, company text, business_unit text, plant text, floor text, room text, cost_center text, profit_center text, status public.asset_status NOT NULL DEFAULT 'active', condition public.asset_condition NOT NULL DEFAULT 'good', criticality text NOT NULL DEFAULT 'medium', useful_life_months integer, remarks text, image_url text, created_by uuid, updated_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id,asset_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets TO authenticated;
GRANT ALL ON public.assets TO service_role;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant access assets" ON public.assets FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));
CREATE INDEX assets_search_idx ON public.assets (organization_id, asset_id, serial_number, name);

CREATE TABLE public.asset_qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE, asset_id uuid NOT NULL UNIQUE REFERENCES public.assets(id) ON DELETE CASCADE, token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE, active boolean NOT NULL DEFAULT true, generated_at timestamptz NOT NULL DEFAULT now(), generated_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_qr_codes TO authenticated;
GRANT ALL ON public.asset_qr_codes TO service_role;
ALTER TABLE public.asset_qr_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant access QR" ON public.asset_qr_codes FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

CREATE TABLE public.asset_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE, asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE, event_type text NOT NULL, actor_id uuid, summary text NOT NULL, old_value jsonb, new_value jsonb, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.asset_events TO authenticated;
GRANT ALL ON public.asset_events TO service_role;
ALTER TABLE public.asset_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant reads events" ON public.asset_events FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "Tenant creates events" ON public.asset_events FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id) AND (actor_id IS NULL OR actor_id=auth.uid()));

CREATE TABLE public.asset_assignments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE, asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE, employee_id uuid REFERENCES public.employees(id), department_id uuid REFERENCES public.departments(id), location_id uuid REFERENCES public.locations(id), assignment_date date NOT NULL DEFAULT current_date, expected_return_date date, remarks text, returned_at timestamptz, created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.asset_assignments TO authenticated; GRANT ALL ON public.asset_assignments TO service_role; ALTER TABLE public.asset_assignments ENABLE ROW LEVEL SECURITY; CREATE POLICY "Tenant access assignments" ON public.asset_assignments FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

CREATE TABLE public.asset_transfers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE, asset_id uuid NOT NULL REFERENCES public.assets(id), from_location_id uuid REFERENCES public.locations(id), to_location_id uuid REFERENCES public.locations(id), from_employee_id uuid REFERENCES public.employees(id), to_employee_id uuid REFERENCES public.employees(id), transfer_date date NOT NULL DEFAULT current_date, reason text NOT NULL, remarks text, approved_by uuid, status public.workflow_status NOT NULL DEFAULT 'pending', created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.asset_transfers TO authenticated; GRANT ALL ON public.asset_transfers TO service_role; ALTER TABLE public.asset_transfers ENABLE ROW LEVEL SECURITY; CREATE POLICY "Tenant access transfers" ON public.asset_transfers FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

CREATE TABLE public.maintenance_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE, asset_id uuid NOT NULL REFERENCES public.assets(id), maintenance_type text NOT NULL CHECK (maintenance_type IN ('preventive','corrective','breakdown','inspection')), title text NOT NULL, service_provider text, technician text, start_date date, completion_date date, next_maintenance_date date, cost numeric(14,2) NOT NULL DEFAULT 0, parts_used text, remarks text, status public.workflow_status NOT NULL DEFAULT 'pending', created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.maintenance_requests TO authenticated; GRANT ALL ON public.maintenance_requests TO service_role; ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY; CREATE POLICY "Tenant access maintenance" ON public.maintenance_requests FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

CREATE TABLE public.verification_campaigns (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE, name text NOT NULL, starts_on date NOT NULL, ends_on date, status public.workflow_status NOT NULL DEFAULT 'draft', scope jsonb NOT NULL DEFAULT '{}'::jsonb, created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.verification_campaigns TO authenticated; GRANT ALL ON public.verification_campaigns TO service_role; ALTER TABLE public.verification_campaigns ENABLE ROW LEVEL SECURITY; CREATE POLICY "Tenant access campaigns" ON public.verification_campaigns FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

CREATE TABLE public.asset_verifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE, campaign_id uuid REFERENCES public.verification_campaigns(id), asset_id uuid NOT NULL REFERENCES public.assets(id), status text NOT NULL CHECK (status IN ('verified','not_found','location_mismatch','employee_mismatch','condition_mismatch','duplicate','damaged')), confirmed_location_id uuid REFERENCES public.locations(id), confirmed_condition public.asset_condition, photo_url text, remarks text, verified_by uuid, verified_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.asset_verifications TO authenticated; GRANT ALL ON public.asset_verifications TO service_role; ALTER TABLE public.asset_verifications ENABLE ROW LEVEL SECURITY; CREATE POLICY "Tenant access verifications" ON public.asset_verifications FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

CREATE TABLE public.integrations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE, provider text NOT NULL, name text NOT NULL, status text NOT NULL DEFAULT 'disconnected', config_public jsonb NOT NULL DEFAULT '{}'::jsonb, encrypted_secret_ref text, last_synced_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integrations TO authenticated; GRANT ALL ON public.integrations TO service_role; ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY; CREATE POLICY "Tenant access integrations" ON public.integrations FOR ALL TO authenticated USING (public.is_org_member(organization_id) AND (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'))) WITH CHECK (public.is_org_member(organization_id) AND (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin')));

CREATE TABLE public.notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE, user_id uuid, type text NOT NULL, title text NOT NULL, body text NOT NULL, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated; GRANT ALL ON public.notifications TO service_role; ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY; CREATE POLICY "Users view notifications" ON public.notifications FOR SELECT TO authenticated USING (public.is_org_member(organization_id) AND (user_id IS NULL OR user_id=auth.uid())); CREATE POLICY "Users mark notifications read" ON public.notifications FOR UPDATE TO authenticated USING (user_id=auth.uid());

CREATE OR REPLACE FUNCTION public.get_public_asset(_token uuid) RETURNS TABLE(asset_id text, asset_name text, company text, status public.asset_status) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT a.asset_id,a.name,a.company,a.status FROM public.asset_qr_codes q JOIN public.assets a ON a.id=q.asset_id WHERE q.token=_token AND q.active LIMIT 1 $$;
GRANT EXECUTE ON FUNCTION public.get_public_asset(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE TRIGGER organizations_updated BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER assets_updated BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER transfers_updated BEFORE UPDATE ON public.asset_transfers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER maintenance_updated BEFORE UPDATE ON public.maintenance_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
