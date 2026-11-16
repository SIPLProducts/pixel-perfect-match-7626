# Add SAP Proxy Middleware to the project

A small standalone Node.js service, kept separate from the Asset360 web app, that the **SAP API Settings > Middleware Configuration** option talks to.

## What gets added
- `middleware/server.js` — no external dependencies (Node 18+), listens on port 3002 by default.
  - `GET /health` — returns status/uptime (used by "Test Middleware").
  - `POST /sap/request` — forwards `{ url, method, headers, body }` to SAP and returns SAP's status and body (used by the Test Runner).
  - Every request must carry the correct `x-shared-secret` header; constant-time comparison; refuses to start if no secret is set (no default secret).
  - Request body size limit (1 MB) and a request timeout to SAP (30 s).
  - Optional `ALLOWED_SAP_HOSTS` list so the proxy can only reach your SAP hosts.
  - Optional `SAP_INSECURE_TLS=1` for self-signed SAP certificates (off by default).
  - Logs method + target host only, never credentials or bodies.
- `middleware/package.json` — `npm start` script, `"type": "module"`.
- `middleware/.env.example` — `PORT`, `PROXY_SECRET`, `ALLOWED_SAP_HOSTS`, `SAP_INSECURE_TLS`.
- `middleware/ecosystem.config.cjs` — PM2 config (`qr-sap-proxy`).
- `middleware/README.md` — Windows and Linux run steps, PM2 steps, and how to fill the matching values in Middleware Configuration.

## Not changed
- No changes to the Asset360 app, database, SAP API Settings screen, or MIS. Port 3002 is already used by MIS Quality on the client server, so the README tells you to pick a free port there (e.g. 3012) and enter the same port in Middleware Configuration.

## Verification
- Start it locally, call `/health` with and without the secret, and forward a test request to a public URL to confirm the response passes through.
