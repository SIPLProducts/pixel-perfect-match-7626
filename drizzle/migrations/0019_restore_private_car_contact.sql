REVOKE ALL ON FUNCTION public.get_public_car_contact(uuid) FROM PUBLIC, anon, authenticated;
COMMENT ON FUNCTION public.get_public_car_contact(uuid) IS 'DEPRECATED: direct owner number exposure is disabled. Public contact uses get_public_car and private Sharvi-mediated messaging.';
REVOKE ALL ON FUNCTION public.get_public_car(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_car(uuid) TO anon, authenticated;