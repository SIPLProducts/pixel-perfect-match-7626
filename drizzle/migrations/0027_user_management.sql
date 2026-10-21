-- Rollback: previous definitions
-- is_org_member: SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND organization_id=_organization_id)
-- has_role: SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client_tester';
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.is_org_member(_organization_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND organization_id=_organization_id AND active) $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role AND active) $$;

CREATE OR REPLACE FUNCTION public.list_workspace_users()
 RETURNS TABLE(user_id uuid, email text, full_name text, role app_role, active boolean, invited boolean, last_sign_in_at timestamptz, created_at timestamptz)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT r.user_id, u.email::text, coalesce(p.full_name, ''), r.role, r.active,
         (u.last_sign_in_at IS NULL), u.last_sign_in_at, r.created_at
  FROM public.user_roles me
  JOIN public.user_roles r ON r.organization_id = me.organization_id
  JOIN auth.users u ON u.id = r.user_id
  LEFT JOIN public.profiles p ON p.id = r.user_id
  WHERE me.user_id = auth.uid() AND me.active AND me.role IN ('super_admin','admin')
  ORDER BY r.created_at
$$;
REVOKE ALL ON FUNCTION public.list_workspace_users() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.list_workspace_users() TO authenticated;