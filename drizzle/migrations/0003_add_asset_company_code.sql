ALTER TABLE public.assets ADD COLUMN company_code text;
COMMENT ON COLUMN public.assets.company_code IS 'Company code used for financial and organizational asset classification.';