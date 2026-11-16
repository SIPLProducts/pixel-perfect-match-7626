# Run the SAP middleware with a .env file (Option 2)

No app changes are needed. Follow these steps on your Windows machine in PowerShell.

## Steps

1. Go to the middleware folder:
```powershell
cd "C:\QR ASSETS\pixel-perfect-match-7626\middleware"
```

2. Create the .env file from the example:
```powershell
Copy-Item .env.example .env
```

3. Open it in Notepad:
```powershell
notepad .env
```
Set these two lines (choose your own long secret), then save and close:
```env
PORT=3002
PROXY_SECRET=MyLongSecret_ChangeThis_2026
```

4. Start the middleware:
```powershell
node --env-file=.env server.js
```
You should see: `Asset360 SAP Proxy Middleware listening on port 3002`. Keep this window open.

5. Check it from a second PowerShell window:
```powershell
curl.exe -H "x-proxy-secret: MyLongSecret_ChangeThis_2026" http://localhost:3002/health
```

6. In Asset360, open SAP API Settings, then Middleware Configuration:
   - Host / URL: `http://localhost`
   - Port: `3002`
   - Shared Secret: the same value as PROXY_SECRET
   - Press Test Middleware.

## Notes
- Do not share or commit the .env file; it holds the secret.
- On the client's server use `PORT=3012`, because 3002 is used by MIS Quality.
