/**
 * The single connection point for the SAP asset API (owned by another team).
 * Connect it by replacing `sapAssetSource` with an implementation that calls the
 * agreed endpoint (or a server function, if the API needs a secret) and maps SAP's
 * response onto the Add Asset form's own field names. Read-only: nothing here saves assets.
 */
export type SapAssetCode = { code: string; label: string };
/** Values keyed by Add Asset form field names (e.g. "name", "serialNumber"). */
export type SapAssetValues = Record<string, string | number | null | undefined>;

export interface SapAssetSource {
  configured: boolean;
  searchCodes(query: string): Promise<SapAssetCode[]>;
  getDetails(code: string): Promise<SapAssetValues>;
}

export const notConfiguredSapSource: SapAssetSource = {
  configured: false,
  async searchCodes() { return []; },
  async getDetails() { return {}; },
};

export const sapAssetSource: SapAssetSource = notConfiguredSapSource;

/** Keep only values for known form fields that SAP actually returned. */
export function mapSapValues(values: SapAssetValues, formKeys: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of formKeys) {
    const value = values[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") out[key] = String(value);
  }
  return out;
}
