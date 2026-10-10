export const assetErpFields = [
  { key: "externalAssetNumber", column: "external_asset_number", label: "Asset (ERP number)", type: "text", section: "ERP identification" },
  { key: "assetSubnumber", column: "asset_subnumber", label: "Sub-number", type: "text", section: "ERP identification" },
  { key: "depreciationKey", column: "depreciation_key", label: "Depreciation key", type: "text", section: "Depreciation & life" },
  { key: "depreciationStartDate", column: "depreciation_start_date", label: "Depreciation calculation start date", type: "date", section: "Depreciation & life" },
  { key: "costCenter", column: "cost_center", label: "Cost center", type: "text", section: "ERP identification" },
  { key: "plannedLife", column: "planned_life", label: "Life", type: "text", section: "Depreciation & life" },
  { key: "erpLocation", column: "erp_location", label: "Location (ERP code)", type: "text", section: "ERP identification" },
  { key: "specialDepreciation", column: "special_depreciation", label: "Special depreciation", type: "number", section: "Depreciation & life" },
  { key: "supplier", column: "supplier", label: "Supplier", type: "text", section: "ERP identification" },
  { key: "accumulatedDepreciation", column: "accumulated_depreciation", label: "Accumulated depreciation", type: "number", section: "Depreciation & life" },
  { key: "quantity", column: "quantity", label: "Quantity", type: "number", section: "ERP identification" },
  { key: "wbsElement", column: "wbs_element", label: "WBS element", type: "text", section: "ERP identification" },
  { key: "startingBookValue", column: "starting_book_value", label: "Starting book value", type: "number", section: "Financial movements" },
  { key: "baseUnit", column: "base_unit", label: "Base unit of measure", type: "text", section: "ERP identification" },
  { key: "currency", column: "currency", label: "Currency", type: "text", section: "Financial movements" },
  { key: "writeUps", column: "write_ups", label: "Write-ups", type: "number", section: "Financial movements" },
  { key: "transactionAcquisitionValue", column: "transaction_acquisition_value", label: "Transaction acquisition value", type: "number", section: "Financial movements" },
  { key: "transferredAccumulatedDepreciation", column: "transferred_accumulated_depreciation", label: "Transferred accumulated depreciation", type: "number", section: "Financial movements" },
  { key: "plannedDepreciation", column: "planned_depreciation", label: "Planned depreciation", type: "number", section: "Depreciation & life" },
  { key: "erpReference1", column: "erp_reference_1", label: "Reference (1)", type: "text", section: "Additional references" },
  { key: "erpReference2", column: "erp_reference_2", label: "Reference (2)", type: "text", section: "Additional references" },
  { key: "erpReference3", column: "erp_reference_3", label: "Reference (3)", type: "text", section: "Additional references" },
  { key: "erpReference4", column: "erp_reference_4", label: "Reference (4)", type: "text", section: "Additional references" },
] as const;

export function erpDisplayValue(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  return typeof value === "number" ? new Intl.NumberFormat("en-IN", { maximumFractionDigits: 6 }).format(value) : value;
}