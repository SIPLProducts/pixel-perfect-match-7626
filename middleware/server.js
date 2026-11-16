// Asset360 SAP Proxy Middleware — standalone, no dependencies (Node 18+).
import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";

// Load settings from .env next to this file when present (Node 20.6+).
const envPath = new URL("./.env", import.meta.url);
if (existsSync(envPath) && typeof process.loadEnvFile === "function") process.loadEnvFile(envPath);

const PORT = Number(process.env.PORT || 3002);
const SECRET = process.env.PROXY_SECRET || "";
const ALLOWED = (process.env.ALLOWED_SAP_HOSTS || "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
const MAX_BODY = 1024 * 1024;
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS) || 180000;
// Characters of payload printed to the terminal; 0 prints everything.
const MAX_LOG_BODY = Number(process.env.MAX_LOG_BODY ?? 4000);
const clip = (t) => (MAX_LOG_BODY > 0 && t.length > MAX_LOG_BODY ? `${t.slice(0, MAX_LOG_BODY)}\n... (${t.length - MAX_LOG_BODY} more chars)` : t);
const maskHeaders = (h) => Object.fromEntries(Object.entries(h).map(([k, v]) => [k, /authorization|secret|password|token/i.test(k) ? "***" : v]));

if (!SECRET) {
  console.error("PROXY_SECRET is not set. Refusing to start.");
  process.exit(1);
}
if (process.env.SAP_INSECURE_TLS === "1") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  console.warn("Warning: TLS certificate checks are disabled (SAP_INSECURE_TLS=1).");
}

function secretOk(value) {
  if (typeof value !== "string") return false;
  const a = Buffer.from(value), b = Buffer.from(SECRET);
  return a.length === b.length && timingSafeEqual(a, b);
}
function send(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  if (!secretOk(req.headers["x-shared-secret"])) { console.warn(`[auth] rejected ${req.method} ${req.url}`); }
  if (!secretOk(req.headers["x-shared-secret"])) return send(res, 401, { ok: false, message: "Unauthorized" });

  if (req.method === "GET" && req.url === "/health") {
    console.log("[health] check ok");
    return send(res, 200, { status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
  }

  if (req.method === "POST" && req.url === "/sap/request") {
    let size = 0; const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) { send(res, 413, { ok: false, message: "Request too large" }); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", async () => {
      if (res.writableEnded) return;
      let target;
      try {
        const { url, method = "GET", headers = {}, body, timeout_ms } = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        target = new URL(url);
        if (!/^https?:$/.test(target.protocol)) return send(res, 400, { ok: false, message: "Only http/https URLs allowed" });
        if (ALLOWED.length && !ALLOWED.includes(target.hostname.toLowerCase())) return send(res, 403, { ok: false, message: "Host not allowed" });
        const payload = body == null || method === "GET" ? undefined : typeof body === "string" ? body : JSON.stringify(body);
        const limit = Number(timeout_ms) > 0 ? Number(timeout_ms) : TIMEOUT_MS;
        const started = Date.now();
        console.log(`\n[proxy] ${new Date().toISOString()} ${method} ${target.href} (timeout ${limit / 1000}s)`);
        console.log("[proxy] request headers:", JSON.stringify(maskHeaders(headers)));
        console.log("[proxy] request payload:", payload ? clip(payload) : "(none)");
        const r = await fetch(target, { method, headers, body: payload, signal: AbortSignal.timeout(limit) });
        const text = await r.text();
        console.log(`[proxy] response ${r.status} ${r.statusText} in ${Date.now() - started} ms, ${(text.length / 1048576).toFixed(2)} MB`);
        console.log("[proxy] response payload:", clip(text));
        res.writeHead(r.status, { "Content-Type": r.headers.get("content-type") || "application/json" });
        res.end(text);
      } catch (err) {
        console.error(`[proxy] error${target ? " for " + target.href : ""}: ${err.name} ${err.message}`);
        send(res, err.name === "TimeoutError" ? 504 : 502, { ok: false, message: `Proxy error: ${err.message}` });
      }
    });
    return;
  }
  send(res, 404, { ok: false, message: "Not found" });
});

server.listen(PORT, "0.0.0.0", () => console.log(`SAP proxy listening on port ${PORT}`));
