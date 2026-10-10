CREATE TABLE public.cars (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 registration_number text NOT NULL CHECK(length(registration_number) BETWEEN 2 AND 30),
 owner_name text NOT NULL CHECK(length(owner_name) BETWEEN 2 AND 100),
 owner_mobile text NOT NULL CHECK(owner_mobile ~ '^\+[1-9][0-9]{7,14}$'),
 make text NOT NULL CHECK(length(make) BETWEEN 1 AND 80),
 model text NOT NULL CHECK(length(model) BETWEEN 1 AND 80),
 color text NOT NULL DEFAULT '' CHECK(length(color)<=50),
 manufacture_year integer CHECK(manufacture_year BETWEEN 1900 AND 2100),
 parking_slot text NOT NULL DEFAULT '' CHECK(length(parking_slot)<=80),
 remarks text NOT NULL DEFAULT '' CHECK(length(remarks)<=1000),
 active boolean NOT NULL DEFAULT true,
 qr_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,registration_number),
 UNIQUE(id,organization_id)
);
GRANT SELECT, INSERT, UPDATE ON public.cars TO authenticated;
GRANT ALL ON public.cars TO service_role;
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace car reads" ON public.cars FOR SELECT TO authenticated USING(public.is_org_member(organization_id));
CREATE POLICY "Workspace car creation" ON public.cars FOR INSERT TO authenticated WITH CHECK(public.is_org_member(organization_id) AND created_by=auth.uid());
CREATE POLICY "Workspace car edits" ON public.cars FOR UPDATE TO authenticated USING(public.is_org_member(organization_id)) WITH CHECK(public.is_org_member(organization_id));
CREATE FUNCTION public.guard_car_identity() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF NEW.id IS DISTINCT FROM OLD.id OR NEW.organization_id IS DISTINCT FROM OLD.organization_id OR NEW.qr_token IS DISTINCT FROM OLD.qr_token OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN RAISE EXCEPTION 'Car identity cannot be replaced'; END IF; NEW.updated_at=now(); RETURN NEW; END $$;
CREATE TRIGGER cars_updated BEFORE UPDATE ON public.cars FOR EACH ROW EXECUTE FUNCTION public.guard_car_identity();

CREATE TABLE public.car_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL,
 car_id uuid NOT NULL,
 reason text NOT NULL CHECK(reason IN ('wrong_parking','blocked_access','move_car','reserved_slot','other')),
 message text NOT NULL DEFAULT '' CHECK(length(message)<=1000),
 status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','acknowledged')),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(car_id,organization_id) REFERENCES public.cars(id,organization_id) ON DELETE CASCADE
);
GRANT SELECT ON public.car_messages TO authenticated;
GRANT UPDATE(status) ON public.car_messages TO authenticated;
GRANT ALL ON public.car_messages TO service_role;
ALTER TABLE public.car_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace parking message reads" ON public.car_messages FOR SELECT TO authenticated USING(public.is_org_member(organization_id));
CREATE POLICY "Workspace parking message acknowledgement" ON public.car_messages FOR UPDATE TO authenticated USING(public.is_org_member(organization_id)) WITH CHECK(public.is_org_member(organization_id));
CREATE INDEX car_messages_workspace_created ON public.car_messages(organization_id,created_at DESC,id);
CREATE INDEX cars_workspace_created ON public.cars(organization_id,created_at DESC,id);
CREATE FUNCTION public.get_public_car(_token uuid) RETURNS TABLE(registration_number text,owner_name text,mobile_masked text,make text,model text,color text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT c.registration_number,c.owner_name,'••••••' || right(c.owner_mobile,4),c.make,c.model,c.color FROM public.cars c WHERE c.qr_token=_token AND c.active LIMIT 1 $$;
REVOKE ALL ON FUNCTION public.get_public_car(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_car(uuid) TO anon,authenticated;
CREATE FUNCTION public.submit_car_message(_token uuid,_reason text,_message text DEFAULT '') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE c public.cars%ROWTYPE; result uuid; BEGIN SELECT * INTO c FROM public.cars WHERE qr_token=_token AND active; IF NOT FOUND THEN RAISE EXCEPTION 'Car label unavailable'; END IF; IF _reason IS NULL OR _reason NOT IN ('wrong_parking','blocked_access','move_car','reserved_slot','other') OR coalesce(length(_message),0)>1000 THEN RAISE EXCEPTION 'Check the parking message'; END IF; INSERT INTO public.car_messages(organization_id,car_id,reason,message) VALUES(c.organization_id,c.id,_reason,coalesce(trim(_message),'')) RETURNING id INTO result; RETURN result; END $$;
REVOKE ALL ON FUNCTION public.submit_car_message(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_car_message(uuid,text,text) TO anon,authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cars,public.car_messages;