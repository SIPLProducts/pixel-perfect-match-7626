/** Pure scheduling and endpoint-selection rules shared by manual and automatic SAP sync. */
export const SAP_AUTO_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;
export const SAP_SYNC_STALE_MS = 2 * 60 * 60 * 1000;

/** Returns the next strict 00:00/06:00/12:00/18:00 UTC boundary. */
export function nextSapSyncBoundary(after: Date): Date {
  const next = new Date(after);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours((Math.floor(next.getUTCHours() / 6) + 1) * 6);
  return next;
}

export function sapSyncDelay(after: Date): number {
  return Math.max(1000, nextSapSyncBoundary(after).getTime() - after.getTime());
}

export function isSapSyncRunStale(startedAt: string, now: Date): boolean {
  return now.getTime() - new Date(startedAt).getTime() > SAP_SYNC_STALE_MS;
}

export type SapSyncEndpointChoice = { id: string; name: string; path?: string };

/** Keeps the existing Asset QR API selection order used by the manual sync dialog. */
export function selectAssetQrEndpoint<T extends SapSyncEndpointChoice>(endpoints: T[]): T | undefined {
  return endpoints.find(e => e.name.trim().toLowerCase() === "asset qr api")
    ?? endpoints.find(e => String(e.path ?? "").includes("/asset/qr/report"))
    ?? endpoints.find(e => /asset\s*qr/i.test(e.name))
    ?? endpoints[0];
}
