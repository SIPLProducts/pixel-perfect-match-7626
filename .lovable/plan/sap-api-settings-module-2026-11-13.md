# SAP API Settings module

A new admin-only screen, **SAP API Settings**, placed in the side menu directly after **Settings**. It uses the existing Asset360 look (glass panels, current badges, buttons, tabs and toasts). No existing screen, data or workflow is changed. The current Add Asset "With SAP" mode stays as it is until you approve linking it to these endpoints.

## What users will see

**Main screen** (title, plug icon, subtitle as specified) with three tabs:

1. **APIs**: a count badge, search by name or path, a module filter (All / MM / SD / COMMON) and a **New Endpoint** button. The table shows Name, Description, Module, HTTP Method colored by method, Path, an Active switch, and Test / Edit / Delete buttons. Test shows a spinner, then the response time in ms. Delete asks for confirmation first. Saving a new endpoint opens its edit screen.
2. **SAP Connection**: Environment, Base URL, Technical User, and a Password with show/hide. When a password is already stored, a "Password is saved" badge appears and the password itself is never shown. The tab has **Test SAP Connection** (shows HTTP status and ms) and **Save Connection** buttons.
3. **Middleware Configuration**: Connection Mode (Direct / Via Proxy), Deployment Mode (Cloud / Self-Hosted), Middleware URL, Port (default 3002) and Shared Secret (shows "saved" status only). The tab has **Test Middleware Health** and **Save** buttons.

**Endpoint edit screen** opens inside the same page, with a back link, the endpoint name, method and module badges, an active switch and a **Test Endpoint** button. It has five tabs:
- **Configuration**: all endpoint fields, including API Type (fetch / sync).
- **Request Fields**: an editable table (field, source, default, required, order) with move up/down, add and remove. **Import from JSON** flattens pasted JSON into rows like `HEADER.PLANT` and `ITEMS[].MATERIAL`; you pick fields with checkboxes, then choose Merge or Replace.
- **Response Fields**: an editable table (field, target table, target column, transform, order) with the same JSON import.
- **Credentials & Headers**: optional per-endpoint user and password (shown only as "saved"), plus an extra-headers JSON box that checks the JSON as you type.
- **Test Runner**: a Run button, a status badge (green for 2xx, red for errors, amber while running), response time, the formatted response or error, and a log of past runs.

**Who can use it**: only Super Admin and Admin. The menu item is hidden from other roles, and the server rejects their requests.

## Behaviour
- Endpoint paths are read live from the database, so changes apply immediately without a rebuild.
- If a path starts with http:// or https://, it is used as given. Otherwise it is joined to the Base URL with duplicate slashes removed.
- In Direct mode, the server calls SAP using Basic Auth. In Proxy mode, the server sends the request to the middleware's `/sap/request` (tests go to `/sap/test` or `/health`) with an `x-shared-secret` header.
- Every create, update and delete is written to the audit log with who made it, when, and which field names changed. Secret values are never logged.

## Technical details
- New additive, workspace-scoped tables (migration, with GRANTs and RLS limited to active admin members):
  - `sap_endpoints`: name, description, module, path, method, auth_type, api_type, active, request_fields jsonb, response_fields jsonb, extra_headers jsonb.
  - `sap_connection_settings`: one row per workspace, with environment, base_url, technical_user, connection_mode, deployment_mode, middleware_url, middleware_port.
  - `sap_secrets`: SAP password, shared secret and per-endpoint passwords. Browser roles get no access; only server code reads or writes it. The screens receive only `password_set` / `secret_set` flags.
  - `sap_test_logs`: endpoint, status, latency, message, actor and time.
  - `sap_audit_log`: action, entity, actor, time and changed field names. It is append-only.
- Server functions in `src/lib/sap-api.functions.ts`, using `requireAppAuth` and an admin role check, cover list, create, update, delete, saving connection and middleware settings, and testing the connection, middleware and endpoints. Each request times out after 15 seconds. URL joining and JSON flattening live in pure helpers in `src/lib/sap-api.ts`.
- UI goes in `src/components/asset360/sap-api/`. Its only hook into the existing app is one new menu entry after "settings" and one branch in the page switch in `workspace.tsx`.
- Note on addresses: the app opens screens from its menu inside one page rather than at separate web addresses. So the screen opens from the menu, not at `/admin/sap-api`. Separate addresses can be added if you need them.
- Tests: path joining, JSON flattening, method colors, admin-only permission, and secrets never returned to the browser. The existing tests must keep passing.
- Self-hosted deployment needs the same migration run on the QR database. The MIS database is not touched.
