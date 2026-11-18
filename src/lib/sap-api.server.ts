import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import { resolveSapUrl } from "@/lib/sap-api";

type Client = SupabaseClient<Database>;
export type SapCallResult = { status: number; latency: number; body: string; ok: boolean; message: string };

// Large SAP reports can take minutes; the server deployment can override this without changing code.
const timeoutMs = () => Number(process.env["SAP_TEST_TIMEOUT_MS"]) || 180000;

export async function timedSapFetch(url: string, init: RequestInit, limit = 20000): Promise<SapCallResult> {
  const started = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs()) });
    const text = (await res.text()).slice(0, limit);
    return { status: res.status, latency: Date.now() - started, body: text, ok: res.ok, message: `${res.status} ${res.statusText}` };
  } catch (error) {
    return { status: 0, latency: Date.now() - started, body: "", ok: false, message: (error as Error).name === "TimeoutError" ? "Request timed out" : "Could not reach host" };
  }
}

export const sapBasicAuth = (user: string, password: string) => `Basic ${btoa(`${user}:${password}`)}`;

export function middlewareBase(url: string, port: number) {
  const parsed = new URL(/^https?:\/\//i.test(url) ? url : `http://${url}`);
  // HTTPS reverse proxies already use their standard port; plain HTTP hosts use the configured port.
  if (!parsed.port && parsed.protocol === "http:") parsed.port = String(port);
  return parsed.toString().replace(/\/+$/, "");
}

export async function readSapSecret(org: string, scope: string) {
  const { data } = await supabaseAdmin.from("sap_secrets").select("secret").eq("organization_id", org).eq("scope", scope).maybeSingle();
  return data?.secret ?? "";
}

export async function callSapEndpoint(
  supabase: Client,
  org: string,
  conn: Database["public"]["Tables"]["sap_connection_settings"]["Row"] | null,
  endpointId: string,
  limit = 20000,
): Promise<SapCallResult> {
  const { data: endpoint } = await supabase.from("sap_endpoints").select("*").eq("id", endpointId).eq("organization_id", org).maybeSingle();
  if (!endpoint) throw new Error("Endpoint not found");
  const url = resolveSapUrl(conn?.base_url ?? "", endpoint.path);
  const headers: Record<string, string> = { Accept: "application/json", ...(endpoint.extra_headers as Record<string, string>) };
  if (endpoint.auth_type === "basic") {
    const own = await readSapSecret(org, `endpoint:${endpoint.id}`);
    headers["Authorization"] = own && endpoint.credential_user
      ? sapBasicAuth(endpoint.credential_user, own)
      : sapBasicAuth(conn?.technical_user ?? "", await readSapSecret(org, "sap_password"));
  }
  const body = endpoint.method === "GET" || endpoint.method === "DELETE"
    ? undefined
    : JSON.stringify(Object.fromEntries((endpoint.request_fields as { name: string; default_value?: string }[]).map(field => [field.name, field.default_value ?? ""])));
  if (body) headers["Content-Type"] = "application/json";
  // Proxy mode with no external middleware URL runs inside this same application process.
  if (conn?.connection_mode === "proxy" && conn.middleware_url?.trim()) {
    return timedSapFetch(`${middlewareBase(conn.middleware_url, conn.middleware_port)}/sap/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "1", "x-shared-secret": await readSapSecret(org, "proxy_secret") },
      body: JSON.stringify({ url, method: endpoint.method, headers, body, timeout_ms: timeoutMs() }),
    }, limit);
  }
  return timedSapFetch(url, body ? { method: endpoint.method, headers, body } : { method: endpoint.method, headers }, limit);
}

export function findSapRows(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter(item => item && typeof item === "object") as Record<string, unknown>[];
  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) {
      const rows = findSapRows(nested);
      if (rows.length) return rows;
    }
  }
  return [];
}
