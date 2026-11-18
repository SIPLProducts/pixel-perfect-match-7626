/** All Asset QR Report API response keys with readable labels, in the API document's order. Values live in assets.sap_fields. */
export const sapReportFields: ReadonlyArray<readonly [string, string]> = [
  ["BUKRS","Company Code"],["ANLN0","Internal Asset Number"],["ANLN1","Asset Number"],["ANLN2","Asset Sub-number"],["ANLKL","Asset Class"],
  ["TXT50","Asset Description"],["GSBER","Business Area"],["KTANSW","Balance Sheet APC Account"],["KANSW","Acquisition Value"],["KUMAFA","Accumulated Depreciation"],
  ["BUCHWERT","Book Value"],["AFABE","Depreciation Area"],["AKTIV","Capitalization Date"],["ERGSO","Balance Sheet Item"],["XANLGR","Asset Group Indicator"],
  ["BTR1","Separate Cumulative Acquisition Value"],["BTR2","Separate Cumulative Ordinary Depreciation"],["BTR3","Write-ups"],["BTR4","Transfer Accumulated Depreciation"],
  ["BTR5","Cumulative Special Depreciation"],["BTR6","Start Book Value"],["BTR7","Cumulative Unplanned Depreciation"],["BTR8","Planned Depreciation"],
  ["BTR9","Cumulative Transfer Reserve"],["BTR10","Planned Special Depreciation"],["BTR11","Planned Unplanned Depreciation"],["BTR12","Planned Transfer Reserve"],
  ["BTR13","Transfer Special Depreciation"],["BTR14","Transfer Unplanned Depreciation"],["BTR15","Transfer Manual Depreciation"],["BTR16","Transfer Ordinary Depreciation"],
  ["BTR17","End Book Value"],["BTR18","Cumulative Ordinary Depreciation"],["BTR19","Planned Ordinary Depreciation"],["BTR20","Acquisition / Transfer Reserve"],
  ["BTR21","Cumulative Acquisition Value"],["BTR22","Accumulated Depreciation (BTR22)"],["BTR23","Planned Depreciation (BTR23)"],["BTR24","Depreciation Transfer-Out"],
  ["BTR25","Depreciation Transfer-In"],["WAERS","Currency"],["AFASL","Depreciation Key"],["AFABG","Depreciation Calculation Start Date"],
  ["SAFBG","Special Depreciation Start Date"],["DAUER","Useful Life"],["MENGE","Asset Quantity"],["MEINS","Base Unit of Measure"],["WERKS","Plant"],
  ["KOSTL","Cost Center"],["STORT","Asset Location"],["LIFNR","Supplier Number"],["POSNR","WBS Element"],["ZZACCQ","Acquisition Amount"],
  ["ZZTRANS_OUT","Transfer-Out Amount"],["ZZTRANS_IN","Transfer-In Amount"],["ZZSCARP","Scrap Amount"],["ZZSALES","Sales Amount"],
  ["ZZDADDITION","Depreciation Addition"],["ZZDTRANS_OUT","Depreciation Transfer-Out (ZZ)"],["ZZDTRANS_IN","Depreciation Transfer-In (ZZ)"],
  ["ZZDSCARP","Depreciation Scrap"],["ZZDSALES","Depreciation Sales"],["TXA50","Asset Description (Additional Text)"],["SERNR","Serial Number"],
  ["INVNR","Inventory Number"],["PRCTR","Profit Center"],["NAME1","Supplier Name"],["EXP_LIFE","Expected Useful Life"],["REM_LIFE","Remaining Useful Life"],
];
export function sapFieldValue(fields: unknown, key: string): string {
  if (!fields || typeof fields !== "object") return "—";
  const v = (fields as Record<string, unknown>)[key];
  if (v === null || v === undefined || v === "") return "—";
  return typeof v === "number" ? new Intl.NumberFormat("en-IN", { maximumFractionDigits: 6 }).format(v) : String(v);
}
