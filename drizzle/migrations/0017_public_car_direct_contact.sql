CREATE OR REPLACE FUNCTION public.get_public_car_contact(_token uuid)
RETURNS TABLE(registration_number text, owner_name text, mobile_masked text, make text, model text, color text, owner_mobile text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT c.registration_number, c.owner_name, '••••••' || right(c.owner_mobile,4), c.make, c.model, c.color, c.owner_mobile FROM public.cars c WHERE c.qr_token = _token AND c.active LIMIT 1 $$;
REVOKE ALL ON FUNCTION public.get_public_car_contact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_car_contact(uuid) TO anon, authenticated;
COMMENT ON FUNCTION public.get_public_car_contact(uuid) IS 'Active-token contact fields for user-approved direct calls and WhatsApp; full number is intentionally available through contact links.';