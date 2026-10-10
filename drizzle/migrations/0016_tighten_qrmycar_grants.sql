REVOKE ALL ON public.cars FROM PUBLIC,anon;
REVOKE ALL ON public.car_messages FROM PUBLIC,anon;
REVOKE INSERT,DELETE,UPDATE ON public.car_messages FROM authenticated;
GRANT SELECT ON public.car_messages TO authenticated;
GRANT UPDATE(status) ON public.car_messages TO authenticated;
REVOKE DELETE ON public.cars FROM authenticated;