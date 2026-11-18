import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { SAP_SYNC_BATCH } from "@/lib/sap-asset-sync";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAppAuth } from "@/lib/app-auth";
import type { Database } from "@/integrations/supabase/types";
import { canManageSap, changedFields, resolveSapUrl, sapAuthTypes, sapMethods, sapModules, sapDataResponse } from "@/lib/sap-api";

type Client = SupabaseClient<Database>;
// Test timeout is configurable on the server (SAP_TEST_TIMEOUT_MS); large SAP reports can take minutes.
const timeoutMs = () => Number(process.env["SAP_TEST_TIMEOUT_MS"]) || 180000;

async function callerAdmin(supabase: Client, userId: string) {
  const { data } = await supabase.from("user_roles").select("organization_id, role").eq("user_id", userId).eq("active", true).limit(1).maybeSingle();
  if (!data || !canManageSap(data.role)) throw new Error("Only Super Admin and Admin can manage SAP API settings");
  return data.organization_id;
}
async function admin() { return (await import("@/integrations/supabase/client.server")).supabaseAdmin; }
async function audit(supabase: Client, org: string, actor: string, action: string, entity: string, entityId: string | null, fields: string[]) {
  await supabase.from("sap_audit_log").insert({ organization_id: org, actor_id: actor, action, entity, entity_id: entityId, changed_fields: fields });
}
async function secretFlags(org: string) {
  const { data } = await (await admin()).from("sap_secrets").select("scope").eq("organization_id", org);
  return new Set((data ?? []).map(r => r.scope));
}
async function readSecret(org: string, scope: string) {
  const { data } = await (await admin()).from("sap_secrets").select("secret").eq("organization_id", org).eq("scope", scope).maybeSingle();
  return data?.secret ?? "";
}
async function writeSecret(org: string, scope: string, secret: string) {
  const { error } = await (await admin()).from("sap_secrets").upsert({ organization_id: org, scope, secret, updated_at: new Date().toISOString() });
  if (error) throw new Error("Secret could not be saved");
}

const endpointSelect = "id,name,description,module,path,method,auth_type,api_type,active,request_fields,response_fields,extra_headers,credential_user,updated_at";
const fieldsSchema = z.array(z.record(z.string(), z.unknown())).max(500);
const endpointBase = z.object({
  name: z.string().trim().min(1).max(120), description: z.string().max(500).default(""),
  module: z.enum(sapModules), path: z.string().trim().min(1).max(1000), method: z.enum(sapMethods), auth_type: z.enum(sapAuthTypes),
});
const endpointUpdate = endpointBase.partial().extend({
  id: z.string().uuid(), api_type: z.enum(["fetch", "sync"]).optional(), active: z.boolean().optional(),
  request_fields: fieldsSchema.optional(), response_fields: fieldsSchema.optional(), extra_headers: z.record(z.string(), z.string()).optional(),
  credential_user: z.string().max(200).nullable().optional(), credential_password: z.string().max(500).optional(),
});

export const getSapSettings = createServerFn({ method: "GET" }).middleware([requireAppAuth]).handler(async ({ context }) => {
  const org = await callerAdmin(context.supabase, context.userId);
  const [{ data: endpoints }, { data: conn }, flags] = await Promise.all([
    context.supabase.from("sap_endpoints").select(endpointSelect).eq("organization_id", org).order("name"),
    context.supabase.from("sap_connection_settings").select("*").eq("organization_id", org).maybeSingle(),
    secretFlags(org),
  ]);
  return {
    endpoints: (endpoints ?? []).map(e => ({ ...e, password_set: flags.has(`endpoint:${e.id}`) })),
    connection: { environment: conn?.environment ?? "Development", base_url: conn?.base_url ?? "", technical_user: conn?.technical_user ?? "", connection_mode: conn?.connection_mode ?? "direct", deployment_mode: conn?.deployment_mode ?? "self_hosted", middleware_url: conn?.middleware_url ?? "", middleware_port: conn?.middleware_port ?? 3002, password_set: flags.has("sap_password"), secret_set: flags.has("proxy_secret") },
  };
});

export const getSapTestLogs = createServerFn({ method: "GET" }).middleware([requireAppAuth]).inputValidator((d: { endpointId: string }) => z.object({ endpointId: z.string().uuid() }).parse(d)).handler(async ({ context, data }) => {
  const org = await callerAdmin(context.supabase, context.userId);
  const { data: rows } = await context.supabase.from("sap_test_logs").select("id,status,latency_ms,message,created_at").eq("organization_id", org).eq("endpoint_id", data.endpointId).order("created_at", { ascending: false }).limit(50);
  return rows ?? [];
});

export const createSapEndpoint = createServerFn({ method: "POST" }).middleware([requireAppAuth]).inputValidator((d) => endpointBase.parse(d)).handler(async ({ context, data }) => {
  const org = await callerAdmin(context.supabase, context.userId);
  const { data: row, error } = await context.supabase.from("sap_endpoints").insert({ ...data, organization_id: org, created_by: context.userId }).select("id").single();
  if (error) throw new Error("Endpoint could not be created");
  await audit(context.supabase, org, context.userId, "create", "endpoint", row.id, Object.keys(data));
  return { id: row.id };
});

export const updateSapEndpoint = createServerFn({ method: "POST" }).middleware([requireAppAuth]).inputValidator((d) => endpointUpdate.parse(d)).handler(async ({ context, data }) => {
  const org = await callerAdmin(context.supabase, context.userId);
  const { id, credential_password, ...patch } = data;
  const { data: before } = await context.supabase.from("sap_endpoints").select(endpointSelect).eq("id", id).eq("organization_id", org).maybeSingle();
  if (!before) throw new Error("Endpoint not found");
  const fields = changedFields(before as Record<string, unknown>, patch);
  if (fields.length) {
    const { error } = await context.supabase.from("sap_endpoints").update(patch as never).eq("id", id).eq("organization_id", org);
    if (error) throw new Error("Endpoint could not be saved");
  }
  if (credential_password) { await writeSecret(org, `endpoint:${id}`, credential_password); fields.push("credential_password"); }
  if (fields.length) await audit(context.supabase, org, context.userId, "update", "endpoint", id, fields);
  return { ok: true };
});

export const deleteSapEndpoint = createServerFn({ method: "POST" }).middleware([requireAppAuth]).inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d)).handler(async ({ context, data }) => {
  const org = await callerAdmin(context.supabase, context.userId);
  const { error } = await context.supabase.from("sap_endpoints").delete().eq("id", data.id).eq("organization_id", org);
  if (error) throw new Error("Endpoint could not be deleted");
  await (await admin()).from("sap_secrets").delete().eq("organization_id", org).eq("scope", `endpoint:${data.id}`);
  await audit(context.supabase, org, context.userId, "delete", "endpoint", data.id, []);
  return { ok: true };
});

const connSchema = z.object({
  environment: z.string().max(60).optional(), base_url: z.string().max(500).optional(), technical_user: z.string().max(200).optional(),
  connection_mode: z.enum(["direct", "proxy"]).optional(), deployment_mode: z.enum(["cloud", "self_hosted"]).optional(),
  middleware_url: z.string().max(500).optional(), middleware_port: z.number().int().min(1).max(65535).optional(),
  password: z.string().max(500).optional(), shared_secret: z.string().max(500).optional(),
});
export const saveSapConnection = createServerFn({ method: "POST" }).middleware([requireAppAuth]).inputValidator((d) => connSchema.parse(d)).handler(async ({ context, data }) => {
  const org = await callerAdmin(context.supabase, context.userId);
  const { password, shared_secret, ...raw } = data;
  const settings = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined)) as Record<string, string | number>;
  if (settings["base_url"] && !/^https?:\/\//i.test(String(settings["base_url"]))) throw new Error("Base URL must start with http:// or https://");
  const { data: before } = await context.supabase.from("sap_connection_settings").select("*").eq("organization_id", org).maybeSingle();
  const fields = changedFields((before ?? {}) as Record<string, unknown>, settings);
  const { error } = await context.supabase.from("sap_connection_settings").upsert({ ...settings, organization_id: org, updated_by: context.userId, updated_at: new Date().toISOString() });
  if (error) throw new Error("Settings could not be saved");
  if (password) { await writeSecret(org, "sap_password", password); fields.push("password"); }
  if (shared_secret) { await writeSecret(org, "proxy_secret", shared_secret); fields.push("shared_secret"); }
  if (fields.length) await audit(context.supabase, org, context.userId, before ? "update" : "create", "connection", org, fields);
  return { ok: true };
});

async function timedFetch(url: string, init: RequestInit, limit = 20000) {
  const started = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs()) });
    const text = (await res.text()).slice(0, limit);
    return { status: res.status, latency: Date.now() - started, body: text, ok: res.ok, message: `${res.status} ${res.statusText}` };
  } catch (e) {
    return { status: 0, latency: Date.now() - started, body: "", ok: false, message: (e as Error).name === "TimeoutError" ? "Request timed out" : "Could not reach host" };
  }
}
const basic = (u: string, p: string) => `Basic ${btoa(`${u}:${p}`)}`;
function middlewareBase(url: string, port: number) {
  const u = new URL(/^https?:\/\//i.test(url) ? url : `http://${url}`);
  // https addresses (ngrok, reverse proxies) already use their standard port; only plain http hosts get the configured port.
  if (!u.port && u.protocol === "http:") u.port = String(port);
  return u.toString().replace(/\/+$/, "");
}

async function callEndpoint(supabase: Client, org: string, conn: Database["public"]["Tables"]["sap_connection_settings"]["Row"] | null, endpointId: string, limit = 20000) {
  let result: Awaited<ReturnType<typeof timedFetch>>;
        const { data: ep } = await supabase.from("sap_endpoints").select("*").eq("id", endpointId).eq("organization_id", org).maybeSingle();
        if (!ep) throw new Error("Endpoint not found");
        const url = resolveSapUrl(conn?.base_url ?? "", ep.path);
        const headers: Record<string, string> = { Accept: "application/json", ...(ep.extra_headers as Record<string, string>) };
        if (ep.auth_type === "basic") {
          const own = await readSecret(org, `endpoint:${ep.id}`);
          headers["Authorization"] = own && ep.credential_user ? basic(ep.credential_user, own) : basic(conn?.technical_user ?? "", await readSecret(org, "sap_password"));
        }
        const body = ep.method === "GET" || ep.method === "DELETE" ? undefined : JSON.stringify(Object.fromEntries((ep.request_fields as { name: string; default_value?: string }[]).map(f => [f.name, f.default_value ?? ""])));
        if (body) headers["Content-Type"] = "application/json";
        if (conn?.connection_mode === "proxy") {
          if (!conn.middleware_url) throw new Error("Middleware URL is not configured");
          result = await timedFetch(`${middlewareBase(conn.middleware_url, conn.middleware_port)}/sap/request`, { method: "POST", headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "1", "x-shared-secret": await readSecret(org, "proxy_secret") }, body: JSON.stringify({ url, method: ep.method, headers, body, timeout_ms: timeoutMs() }) }, limit);
        } else result = await timedFetch(url, body ? { method: ep.method, headers, body } : { method: ep.method, headers }, limit);
  return result;
}

export const testSap = createServerFn({ method: "POST" }).middleware([requireAppAuth])
  .inputValidator((d: { target: "connection" | "middleware" | "endpoint"; endpointId?: string }) => z.object({ target: z.enum(["connection", "middleware", "endpoint"]), endpointId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ context, data }) => {
    const org = await callerAdmin(context.supabase, context.userId);
    const { data: conn } = await context.supabase.from("sap_connection_settings").select("*").eq("organization_id", org).maybeSingle();
    let result: Awaited<ReturnType<typeof timedFetch>>;
    try {
      if (data.target === "middleware") {
        if (!conn?.middleware_url) throw new Error("Middleware URL is not configured");
        result = await timedFetch(`${middlewareBase(conn.middleware_url, conn.middleware_port)}/health`, { headers: { "x-shared-secret": await readSecret(org, "proxy_secret"), "ngrok-skip-browser-warning": "1" } });
      } else if (data.target === "connection") {
        if (!conn?.base_url) throw new Error("SAP Base URL is not configured");
        result = await timedFetch(conn.base_url, { method: "GET", headers: { Authorization: basic(conn.technical_user, await readSecret(org, "sap_password")) } });
      } else {
        if (!data.endpointId) throw new Error("Endpoint is required");
        result = await callEndpoint(context.supabase, org, conn, data.endpointId);
      }
    } catch (e) {
      result = { status: 0, latency: 0, body: "", ok: false, message: (e as Error).message };
    }
    await context.supabase.from("sap_test_logs").insert({ organization_id: org, endpoint_id: data.endpointId ?? null, target: data.target, status: result.status || null, latency_ms: result.latency, message: result.message, actor_id: context.userId });
    return result;
  });

// Asset Master: runs a saved endpoint and returns its rows for display (read-only, nothing is stored).
function findRows(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter(v => v && typeof v === "object") as Record<string, unknown>[];
  if (value && typeof value === "object") for (const v of Object.values(value)) { const r = findRows(v); if (r.length) return r; }
  return [];
}
export const fetchSapData = createServerFn({ method: "POST" }).middleware([requireAppAuth])
  .inputValidator((d: { endpointId: string }) => z.object({ endpointId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const org = await callerAdmin(context.supabase, context.userId);
    const { data: conn } = await context.supabase.from("sap_connection_settings").select("*").eq("organization_id", org).maybeSingle();
    let result: Awaited<ReturnType<typeof timedFetch>>;
    try { result = await callEndpoint(context.supabase, org, conn, data.endpointId, 60_000_000); }
    catch (e) { result = { status: 0, latency: 0, body: "", ok: false, message: (e as Error).message }; }
    await context.supabase.from("sap_test_logs").insert({ organization_id: org, endpoint_id: data.endpointId, target: "endpoint", status: result.status || null, latency_ms: result.latency, message: `Asset Master: ${result.message}`, actor_id: context.userId });
    let rows: Record<string, unknown>[] = [];
    if (result.ok) { try { rows = findRows(JSON.parse(result.body)); } catch { result.message = "Response is not JSON"; } }
    return sapDataResponse({ ok: result.ok, status: result.status, latency: result.latency, message: result.message, rows: rows as Record<string, string | number | boolean | null>[] });
  });

export const syncSapAssets = createServerFn({ method: "POST" }).middleware([requireAppAuth])
  .inputValidator((d: { rows: unknown[] }) => z.object({ rows: z.array(z.record(z.string(), z.unknown())).min(1).max(SAP_SYNC_BATCH) }).parse(d))
  .handler(async ({ context, data }) => {
    const org = await callerAdmin(context.supabase, context.userId);
    const { data: result, error } = await context.supabase.rpc("sync_sap_asset_rows", { _organization_id: org, _rows: data.rows as never });
    if (error) throw new Error(`SAP sync batch was not saved: ${error.message}`);
    return result as { inserted: number; updated: number; skipped: number };
  });
