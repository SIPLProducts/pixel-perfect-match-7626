// Pure report helpers built only from live, tenant-scoped workspace rows.
export const closedServiceStatuses = new Set(["completed", "cancelled", "closed", "rejected"]);

export function openServiceRequestCount(rows: readonly { status: string }[]) {
  return rows.filter((row) => !closedServiceStatuses.has(String(row.status).toLowerCase())).length;
}

/** Hierarchy-aware: a parent category name matches its own assets and its subcategories' assets. */
export function categoryMatches(asset: { asset_categories?: { name?: string | null } | null; parent_category_name?: string | null }, category: string) {
  return category === "all" || asset.asset_categories?.name === category || asset.parent_category_name === category;
}

export function countBy<T>(rows: readonly T[], key: (row: T) => string | null | undefined, top?: number) {
  const counts = new Map<string, number>();
  for (const row of rows) { const k = key(row) || "Unassigned"; counts.set(k, (counts.get(k) ?? 0) + 1); }
  const sorted = [...counts].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  return top ? sorted.slice(0, top) : sorted;
}

/** Warranty ends today or within the next `days` days (inclusive). */
export function warrantyWithin(end: string | null | undefined, days: number, now = new Date()) {
  if (!end) return false;
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const limit = new Date(start); limit.setDate(limit.getDate() + days);
  const date = new Date(`${end.slice(0, 10)}T00:00:00`);
  return date >= start && date <= limit;
}

export function inDateRange(value: string | null | undefined, from: string, to: string) {
  if (!from && !to) return true;
  if (!value) return false;
  const day = value.slice(0, 10);
  return (!from || day >= from) && (!to || day <= to);
}

export type ReportTable = { title: string; headings: string[]; rows: Array<Array<string | number | null>> };

const monthLabel = new Intl.DateTimeFormat("en-IN", { month: "short", year: "2-digit" });

/** Counts per calendar month for the last `months` months (oldest first), using YYYY-MM of each date. */
export function monthlyCounts(dates: readonly (string | null | undefined)[], months = 12, now = new Date()) {
  const buckets: { key: string; name: string; value: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, name: monthLabel.format(d), value: 0 });
  }
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  for (const value of dates) { const i = value ? index.get(value.slice(0, 7)) : undefined; if (i !== undefined) buckets[i]!.value++; }
  return buckets;
}

export const warrantyBandNames = ["Expired", "0–30 days", "31–60 days", "61–90 days", "Over 90 days", "Not recorded"] as const;

/** Groups warranty end dates into expiry bands relative to today. */
export function warrantyBands(ends: readonly (string | null | undefined)[], now = new Date()) {
  const counts = new Map<string, number>(warrantyBandNames.map((n) => [n, 0]));
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  for (const end of ends) {
    let band: string = "Not recorded";
    if (end) {
      const days = Math.round((new Date(`${end.slice(0, 10)}T00:00:00`).getTime() - today.getTime()) / 86400000);
      band = days < 0 ? "Expired" : days <= 30 ? "0–30 days" : days <= 60 ? "31–60 days" : days <= 90 ? "61–90 days" : "Over 90 days";
    }
    counts.set(band, (counts.get(band) ?? 0) + 1);
  }
  return warrantyBandNames.map((name) => ({ name, value: counts.get(name) ?? 0 }));
}

type QrAsset = { qr_print_count?: number | null; asset_qr_codes?: { active?: boolean | null }[] | { active?: boolean | null } | null };

/** QR figures from stored QR identities and the print ledger only; scans are not logged so are never counted. */
export function qrInsights(assets: readonly QrAsset[], requests: readonly { source?: string | null }[]) {
  const codes = (a: QrAsset) => (Array.isArray(a.asset_qr_codes) ? a.asset_qr_codes : a.asset_qr_codes ? [a.asset_qr_codes] : []);
  return {
    activeQrCodes: assets.filter((a) => codes(a).some((c) => c.active !== false)).length,
    labelsPrinted: assets.reduce((n, a) => n + Number(a.qr_print_count ?? 0), 0),
    neverPrinted: assets.filter((a) => !Number(a.qr_print_count ?? 0)).length,
    qrBreakdownReports: requests.filter((r) => r.source === "qr").length,
  };
}

/** Per-plant totals; open requests are matched by asset code. */
export function plantSummary(
  assets: readonly { asset_id: string; plant?: string | null; status: string }[],
  requests: readonly { status: string; assets?: { asset_id?: string | null } | null }[],
) {
  const rows = new Map<string, { plant: string; total: number; active: number; maintenance: number; missing: number; openRequests: number }>();
  const plantOf = new Map<string, string>();
  for (const a of assets) {
    const plant = a.plant?.trim() || "Unassigned"; plantOf.set(a.asset_id, plant);
    const row = rows.get(plant) ?? { plant, total: 0, active: 0, maintenance: 0, missing: 0, openRequests: 0 };
    row.total++;
    if (a.status === "active" || a.status === "assigned" || a.status === "in_stock") row.active++;
    if (a.status === "under_maintenance" || a.status === "under_repair") row.maintenance++;
    if (a.status === "missing") row.missing++;
    rows.set(plant, row);
  }
  for (const r of requests) {
    if (closedServiceStatuses.has(String(r.status).toLowerCase())) continue;
    const plant = plantOf.get(r.assets?.asset_id ?? ""); if (plant) rows.get(plant)!.openRequests++;
  }
  return [...rows.values()].sort((a, b) => b.total - a.total || a.plant.localeCompare(b.plant));
}
