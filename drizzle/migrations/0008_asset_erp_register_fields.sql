ALTER TABLE public.assets
 ADD COLUMN external_asset_number text,
 ADD COLUMN asset_subnumber text,
 ADD COLUMN depreciation_key text,
 ADD COLUMN depreciation_start_date date,
 ADD COLUMN planned_life text,
 ADD COLUMN erp_location text,
 ADD COLUMN special_depreciation numeric,
 ADD COLUMN accumulated_depreciation numeric,
 ADD COLUMN quantity numeric,
 ADD COLUMN wbs_element text,
 ADD COLUMN starting_book_value numeric,
 ADD COLUMN base_unit text,
 ADD COLUMN currency text,
 ADD COLUMN write_ups numeric,
 ADD COLUMN transaction_acquisition_value numeric,
 ADD COLUMN transferred_accumulated_depreciation numeric,
 ADD COLUMN planned_depreciation numeric,
 ADD COLUMN erp_reference_1 text,
 ADD COLUMN erp_reference_2 text,
 ADD COLUMN erp_reference_3 text,
 ADD COLUMN erp_reference_4 text;
COMMENT ON COLUMN public.assets.external_asset_number IS 'External ERP Asset number, independent from immutable application asset_id and QR identity.';
COMMENT ON COLUMN public.assets.planned_life IS 'Original ERP Life value, preserved as text (for example 000/000).';
COMMENT ON COLUMN public.assets.erp_location IS 'Original ERP Location code, independent from workspace location_id.';