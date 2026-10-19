/**
 * The single connection point for the SAP asset API (owned by another team).
 * Connect it by replacing `sapAssetSource` with an implementation that calls the
 * agreed endpoint (or a server function, if the API needs a secret) and maps the
 * response to these shapes. Read-only: nothing here saves assets.
 */
export type SapAssetCode = { code: string; label: string };
export type SapAssetDetail = { label: string; value: string | null };

export interface SapAssetSource {
  configured: boolean;
  searchCodes(query: string): Promise<SapAssetCode[]>;
  getDetails(code: string): Promise<SapAssetDetail[]>;
}

export const notConfiguredSapSource: SapAssetSource = {
  configured: false,
  async searchCodes() { return []; },
  async getDetails() { return []; },
};

export const sapAssetSource: SapAssetSource = notConfiguredSapSource;
