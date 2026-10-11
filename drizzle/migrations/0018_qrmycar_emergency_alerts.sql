ALTER TABLE public.car_messages DROP CONSTRAINT car_messages_reason_check;
ALTER TABLE public.car_messages ADD CONSTRAINT car_messages_reason_check CHECK (reason IN ('wrong_parking','blocked_access','move_car','reserved_slot','emergency','other'));
CREATE OR REPLACE FUNCTION public.submit_car_message(_token uuid, _reason text, _message text DEFAULT '') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE c public.cars%ROWTYPE; result uuid;
BEGIN
 SELECT * INTO c FROM public.cars WHERE qr_token=_token AND active;
 IF NOT FOUND THEN RAISE EXCEPTION 'Car label unavailable'; END IF;
 IF _reason IS NULL OR _reason NOT IN ('wrong_parking','blocked_access','move_car','reserved_slot','emergency','other') OR coalesce(length(_message),0)>1000 THEN RAISE EXCEPTION 'Check the parking message'; END IF;
 INSERT INTO public.car_messages(organization_id,car_id,reason,message) VALUES(c.organization_id,c.id,_reason,coalesce(trim(_message),'')) RETURNING id INTO result;
 RETURN result;
END; $function$;
REVOKE ALL ON FUNCTION public.submit_car_message(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_car_message(uuid,text,text) TO anon, authenticated;