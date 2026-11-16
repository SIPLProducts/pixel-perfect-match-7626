# Add a ready-to-use middleware settings file

## What will be added
A new file `middleware/.env` so the middleware starts with `node server.js` without extra steps:

```text
PORT=3002
PROXY_SECRET=<a long random secret generated once>
ALLOWED_SAP_HOSTS=
SAP_INSECURE_TLS=0
```

- Secret is a freshly generated 48-character random value (not a guessable word).
- The same secret must then be typed into SAP API Settings -> Middleware Configuration.
- Nothing else in the app changes.

## Important caution
Because you download the project from GitHub, this file will be included in the repository so anyone with repo access can see the secret. Recommended: after the first successful test, change the secret on each machine (and use PORT=3012 on the client's server, since MIS Quality uses 3002).

## Verification
Start the middleware here with no command-line secret and confirm `/health` answers with the secret from the file.
