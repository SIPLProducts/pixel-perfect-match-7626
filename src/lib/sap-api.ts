/** Pure helpers for SAP API Settings (safe in browser and server). */
export const sapModules = ["MM", "SD", "COMMON"] as const;
export const sapMethods = ["GET", "POST", "PUT", "DELETE"] as const;
export const sapAuthTypes = ["basic", "proxy", "none", "oauth"] as const;
export const sapAdminRoles = new Set(["super_admin", "admin"]);
export const canManageSap = (role?: string | null) => !!role && sapAdminRoles.has(role);

export type SapDataResult = {
  ok: boolean; status: number; latency: number; message: string;
  rows: Record<string, string | number | boolean | null>[];
};

/** Keep large SAP reports out of the server-function object serialization envelope. */
export function sapDataResponse(result: SapDataResult): Response {
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}

export type RequestField = { name: string; source: "static" | "column" | "expr" | "secret"; default_value: string; required: boolean; sort: number };
export type ResponseField = { name: string; target_table: string; target_column: string; transform: string; sort: number };

export const methodTone: Record<string, string> = {
  GET: "bg-success/15 text-success border-success/30",
  POST: "bg-primary/15 text-primary border-primary/30",
  PUT: "bg-warning/15 text-warning border-warning/30",
  DELETE: "bg-destructive/15 text-destructive border-destructive/30",
};

/** Absolute paths override the base URL; relative ones are joined with duplicate slashes collapsed. */
export function resolveSapUrl(baseUrl: string, path: string): string {
  const p = path.trim();
  if (/^https?:\/\//i.test(p)) return p;
  const base = baseUrl.trim().replace(/\/+$/, "");
  if (!base) throw new Error("SAP Base URL is not configured");
  return `${base}/${p.replace(/^\/+/, "")}`.replace(/([^:]\/)\/+/g, "$1");
}

/** Flatten JSON into dotted keys; arrays use the first element as ITEMS[].FIELD. */
export function flattenJson(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    const key = `${prefix}[]`;
    return value.length && typeof value[0] === "object" && value[0] !== null ? flattenJson(value[0], key) : [key];
  }
  if (value && typeof value === "object") {
    const out: string[] = [];
    for (const [k, v] of Object.entries(value)) out.push(...flattenJson(v, prefix ? `${prefix}.${k}` : k));
    return out.length ? out : prefix ? [prefix] : [];
  }
  return prefix ? [prefix] : [];
}

export function mergeFieldNames<T extends { name: string; sort: number }>(existing: T[], names: string[], make: (name: string, sort: number) => T, replace: boolean): T[] {
  const base = replace ? [] : [...existing];
  for (const name of names) if (!base.some(f => f.name === name)) base.push(make(name, base.length + 1));
  return base.map((f, i) => ({ ...f, sort: i + 1 }));
}

export function parseHeaders(text: string): { ok: true; value: Record<string, string> } | { ok: false; error: string } {
  if (!text.trim()) return { ok: true, value: {} };
  try {
    const v = JSON.parse(text);
    if (!v || typeof v !== "object" || Array.isArray(v)) return { ok: false, error: "Headers must be a JSON object" };
    for (const val of Object.values(v)) if (typeof val !== "string") return { ok: false, error: "Header values must be strings" };
    return { ok: true, value: v };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export function changedFields(before: Record<string, unknown>, after: Record<string, unknown>): string[] {
  return Object.keys(after).filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
}
