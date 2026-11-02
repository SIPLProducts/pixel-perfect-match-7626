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
