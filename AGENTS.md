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
- Generate asset labels client-side from existing persistent QR tokens through the shared label utility and dialog; fixed millimeter PDF layouts preserve physical printing dimensions without duplicating QR identities.
- All printable and downloadable QR labels use the canonical public asset origin rather than the current browser origin, so labels generated in preview remain accessible without editor authentication.
- Use one inline asset form and shared validation for creation and editing; edits update the existing asset row without replacing its asset ID or QR identity.
- Store ERP register values in typed asset columns and share field metadata across the inline form and display; external asset numbers and location codes never replace application IDs or workspace references.
- Asset attachments use private tenant-and-asset-scoped storage, authenticated upload validation and fresh signed downloads; retrying failed attachments reuses the saved asset rather than creating another row.
- Excel is parsed only in the browser and validated with the shared asset schema; template columns and upload mappings are defined together from ERP field metadata with legacy headings as aliases; one tenant-scoped transaction creates assets plus QR tokens, persists every editable field and never overwrites records.
- QR breakdown submissions derive asset and tenant identity from an active persistent token server-side; a restricted transaction records requests and events, and private photos are visible only to workspace members through expiring links.
- All workspace views share a user-keyed Query cache and a tenant-filtered Realtime subscription with reconnect/focus refresh and periodic fallback, without exposing another user's cache.
- Workspace collection reads paginate in stable order and server requests run in batches of at most six, to avoid truncation and the runtime connection limit.
- Derive QR print counts from immutable tenant-scoped label-output history recorded through an authenticated idempotent database transaction; track print, PDF and PNG delivery once per selected asset, not previews or physical printer completion.
- Per-asset QR history reads that ledger and resolves names via tenant-scoped profile reads, keeping the initiator ID when no profile is available.
- Service request edits use an inline page with shared validation and tenant-scoped updated_at-checked saves; preserve asset, reporter, source and photo, reject stale saves, and keep the dialog read-only.
- Use one inline transfer form with shared validation; transfer edits lock the existing row, enforce tenant manager permissions and updated_at, preserve the asset and origin, reset approval, and record an asset event atomically.
- Transfer register, history and the Asset register's latest-transfer columns derive from live tenant-filtered transfers; completion stays in the assignment transaction, and current location/custodian come from the asset row so pending moves never look completed.
- Category, location and employee writes use authenticated server functions that derive the tenant from user_roles and restrict to manager roles; database delete triggers block removing referenced rows(ON DELETE SET NULL would silently unlink). Locations and employees are deactivated, never deleted, and inactive ones are filtered only from new choices via selectableLocations/selectableEmployees.
- Subdirectories may have their own AGENTS.md (e.g. src/components/qrmycar); read it before changing files there.
- Categories are two levels (parent_id on asset_categories); database triggers block loops, deeper nesting, cross-tenant parents and assets on parent categories, so assets and imports always use subcategories while existing IDs, prefixes and QR tokens stay untouched.
- Category Excel formats are fixed CDN files registered by stable template keys; workspaces link categories to keys (subcategories inherit the parent's link) and unmapped categories get a message, never a fallback file, so client category renames need no code changes.
- SAP asset lookups go only through the SapAssetSource adapter (src/lib/sap-asset-source.ts), which maps SAP data onto the shared Add Asset form field names; SAP-filled fields are read-only and SAP mode never saves until a save workflow is approved.
- User admin (user-management.functions.ts) takes the workspace from the caller's active admin membership; deactivation sets user_roles.active=false (is_org_member/has_role require it) plus an auth ban, so live sessions lose access; sign-up is invite-only.
