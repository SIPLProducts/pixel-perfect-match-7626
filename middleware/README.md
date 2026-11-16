# Asset360 SAP Proxy Middleware

Standalone Node.js (18+) service used by **SAP API Settings > Middleware Configuration**. No `npm install` needed.

## Run on Windows (PowerShell)
```powershell
cd middleware
$env:PROXY_SECRET="your-long-secret"; $env:PORT="3002"; node server.js
```

## Run on Linux
```bash
cd middleware
PROXY_SECRET="your-long-secret" PORT=3012 node server.js
```

## PM2 (client server)
Port 3002 is already used by MIS Quality there — use a free port such as 3012.
Edit `ecosystem.config.cjs` (secret, port, allowed hosts), then:
```bash
pm2 start ecosystem.config.cjs && pm2 save
```

## Settings
| Variable | Purpose |
|---|---|
| PORT | Listening port (default 3002) |
| PROXY_SECRET | Required. Must equal the Shared Secret in Middleware Configuration |
| ALLOWED_SAP_HOSTS | Comma-separated SAP hostnames allowed (recommended) |
| SAP_INSECURE_TLS | `1` to accept self-signed SAP certificates |

## In Asset360
Middleware Configuration: URL = `http://<this-machine>`, Port = the PORT above, Shared Secret = PROXY_SECRET. Press **Test Middleware**.

## Endpoints
- `GET /health`
- `POST /sap/request` with `{ "url", "method", "headers", "body" }`
Both require header `x-shared-secret`.
