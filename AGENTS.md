<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the authentication presentation in the public auth route and reuse existing Cloud accounts and profiles; visual redesigns must not introduce a second account system.
- Import PWA startup directly and catch failures so optional offline support cannot interrupt sign-in.
- Generate asset labels client-side from existing QR tokens via the shared label utility, in fixed millimeter layouts, always using the canonical public asset origin so preview-made labels work without editor auth.
- Use one inline asset form and shared validation for creation and editing; edits update the existing asset row without replacing its asset ID or QR identity.
- Store ERP register values in typed asset columns and share field metadata across the inline form and display; external asset numbers and location codes never replace application IDs or workspace references.
- Asset attachments use private tenant-and-asset-scoped storage, authenticated upload validation and fresh signed downloads; retrying failed attachments reuses the saved asset rather than creating another row.
- Parse Excel workbooks only in the browser and validate preview rows with the shared asset schema; bulk imports use an authenticated, tenant-scoped transaction to create assets and persistent QR tokens together without overwriting existing records.
- Define Excel template columns and upload mappings together, reuse shared ERP field metadata, and preserve legacy template headings as aliases; the import transaction must explicitly persist every editable asset field while generating fresh application identities.
- QR breakdown submissions derive asset and tenant identity from an active persistent token server-side; a restricted transaction records requests and events, and private photos are visible only to workspace members through expiring links.
- All workspace views share a user-keyed Query cache and a tenant-filtered Realtime subscription with reconnect/focus refresh and periodic fallback; this synchronizes saved records without exposing another user's cached workspace.
- Workspace collection reads paginate in stable order and server requests run in batches of at most six; this avoids truncated figures and the published runtime's connection limit.
- QR print counts and per-asset history come from an immutable tenant-scoped output ledger written by an idempotent authenticated transaction (print/PDF/PNG once per asset, not previews); names resolve via tenant-scoped profile reads, keeping the initiator ID when missing.
- Service request edits use an inline page with shared validation and tenant-scoped updated_at-checked saves; preserve asset, reporter, source and photo, reject stale saves, and keep the dialog read-only.
- Use one inline transfer form with shared validation; transfer edits lock the existing row, enforce tenant manager permissions and updated_at, preserve the asset and origin, reset approval, and record an asset event atomically.
- Transfer register, history and the Asset register's latest-transfer columns derive from live tenant-filtered transfers; completion stays in the assignment transaction, and current location/custodian come from the asset row so pending moves never look completed.
- Category, location and employee writes use authenticated server functions that derive the tenant from user_roles and restrict to manager roles; database delete triggers block removing referenced rows because ON DELETE SET NULL foreign keys would silently unlink them. Locations and employees are deactivated, never deleted, and inactive ones are filtered only from new choices via selectableLocations/selectableEmployees.
- Subdirectories may have their own AGENTS.md (e.g. src/components/qrmycar); read it before changing files there.
- Categories are two levels (parent_id on asset_categories); database triggers block loops, deeper nesting, cross-tenant parents and assets on parent categories, so assets and imports always use subcategories while existing IDs, prefixes and QR tokens stay untouched.
- Category Excel formats are fixed CDN files registered by stable template keys; workspaces link categories to keys (subcategories inherit the parent's link) and unmapped categories get a message, never a fallback file, so client category renames need no code changes.
- SAP asset lookups go only through the SapAssetSource adapter (src/lib/sap-asset-source.ts), which maps SAP data onto the shared Add Asset form field names; SAP-filled fields are read-only and SAP mode never saves until a save workflow is approved, so the API contract can change without a UI redesign.
- User admin uses authenticated server functions where the caller's active super_admin/admin membership sets the tenant; invites join the inviter's workspace, deactivation only sets user_roles.active=false (no account-wide auth ban, since one account may belong to several workspaces), and role cards and the read-only Matrix derive counts from the same permissionModules list as the server role sets so they cannot drift.
- Dashboard and Reports figures come only from the live tenant-scoped workspace cache through pure helpers in src/lib/report-builders.ts, and all Excel downloads go through src/lib/report-export.ts (exceljs loaded on demand); this keeps reports consistent with the screens and adds no backend calls.
- Dashboard lives in src/components/asset360/dashboard/; all figures come from the signed-in workspace's cached data via pure helpers in report-builders.ts, and extra sections reach CSV/PDF/Excel through DashboardReport.sections so the three exports stay aligned.
- Create User never modifies existing accounts (used emails are rejected); on failure it deletes only rows for the newly created user ID, then that account. Extra details go in profiles.preferences.user_details with workspace-validated plant/department IDs.
- First-login changes use server-only app_metadata.must_change_password (not user-editable); protected server functions use requireAppAuth (src/lib/app-auth.ts) to refuse flagged accounts.
