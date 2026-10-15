DROP FUNCTION public.get_public_asset_details(uuid);

CREATE OR REPLACE FUNCTION public.get_public_asset_details(_token uuid)
RETURNS TABLE(
  asset_id text,
  asset_name text,
  company text,
  plant text,
  cost_center text,
  equipment_model text,
  capitalization_year integer,
  acquisition_date date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.asset_id,
    a.name,
    a.company,
    a.plant,
    a.cost_center,
    a.model,
    CASE
      WHEN a.capitalization_date IS NULL THEN NULL
      ELSE EXTRACT(YEAR FROM a.capitalization_date)::integer
    END,
    COALESCE(a.capitalization_date, a.purchase_date) AS acquisition_date
  FROM public.asset_qr_codes q
  JOIN public.assets a ON a.id = q.asset_id
  WHERE q.token = _token
    AND q.active
  LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_asset_details(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_asset_details(uuid) TO anon, authenticated, service_role;