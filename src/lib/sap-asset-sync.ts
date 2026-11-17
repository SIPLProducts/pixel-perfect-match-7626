/** Maps SAP Asset QR report rows onto asset register columns for sync_sap_asset_rows. Pure; safe on client and server. */
export type SapRow = Record<string, string | number | boolean | null | undefined>;
export const SAP_SYNC_BATCH = 500;

const text = (v: unknown, max = 100) => { const s = v === null || v === undefined ? "" : String(v).trim(); return s ? s.slice(0, max) : null; };
const num = (v: unknown) => { if (v === null || v === undefined || String(v).trim() === "") return null; const raw = String(v).trim(); const neg = raw.endsWith("-"); const n = Number(raw.replace(/,/g, "").replace(/-$/, "")); return Number.isFinite(n) ? (neg ? -n : n) : null; };
export function sapDate(v: unknown): string | null {
  const s = text(v, 20); if (!s) return null;
  const a = s.match(/^(\d{4})-?(\d{2})-?(\d{2})/); const b = a ? null : s.match(/^(\d{2})[./](\d{2})[./](\d{4})$/);
  const [y, mo, d] = a ? [a[1] ?? "", a[2] ?? "", a[3] ?? ""] : b ? [b[3] ?? "", b[2] ?? "", b[1] ?? ""] : ["", "", ""];
  if (!y) return null;
  if (Number(y) < 1900 || Number(mo) < 1 || Number(mo) > 12 || Number(d) < 1 || Number(d) > 31) return null;
  return `${y}-${mo}-${d}`;
}
/** SAP asset number plus sub-number (when not zero) is the stable register ID, so re-syncs update instead of duplicating. */
export function sapAssetId(row: SapRow): string | null {
  const main = text(row["ANLN1"], 40); if (!main) return null;
  const sub = text(row["ANLN2"], 20);
  return sub && /[1-9]/.test(sub) ? `${main}-${sub}` : main;
}
export function mapSapRow(row: SapRow) {
  const asset_id = sapAssetId(row); if (!asset_id) return null;
  const nonNeg = (v: unknown) => { const n = num(v); return n === null ? null : Math.abs(n); };
  return {
    asset_id, name: text(row["TXT50"], 120) ?? asset_id, plant: text(row["WERKS"]), company_code: text(row["BUKRS"], 50),
    purchase_value: nonNeg(row["ZZACCQ"] ?? row["KANSW"]), current_value: nonNeg(row["BUCHWERT"]),
    capitalization_date: sapDate(row["AKTIV"]), cost_center: text(row["KOSTL"]), supplier: text(row["LIFNR"]), quantity: num(row["MENGE"]),
    base_unit: text(row["MEINS"]), erp_location: text(row["STORT"]), wbs_element: text(row["POSNR"]), planned_life: text(row["DAUER"]),
    depreciation_key: text(row["AFASL"]), depreciation_start_date: sapDate(row["AFABG"]), external_asset_number: text(row["ANLN1"]),
    asset_subnumber: text(row["ANLN2"]), currency: text(row["WAERS"]), accumulated_depreciation: num(row["KNAFA"]),
    special_depreciation: num(row["KSAFA"]), planned_depreciation: num(row["NAFAP"]), subcategory: text(row["ANLKL"]),
  };
}
export function mapSapRows(rows: SapRow[]) { return rows.map(mapSapRow).filter((r): r is NonNullable<typeof r> => r !== null); }
