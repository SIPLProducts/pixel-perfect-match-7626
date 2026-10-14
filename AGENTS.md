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
- Parse Excel workbooks only in the browser and validate preview rows with the shared asset schema; bulk imports use an authenticated, tenant-scoped transaction to create assets and persistent QR tokens together without overwriting existing records.
- Define Excel template columns and upload mappings together, reuse shared ERP field metadata, and preserve legacy template headings as aliases; the import transaction must explicitly persist every editable asset field while generating fresh application identities.
- QR breakdown submissions derive asset and tenant identity from an active persistent token server-side; a restricted transaction records requests and events, and private photos are visible only to workspace members through expiring links.
- All workspace views share a user-keyed Query cache and a tenant-filtered Realtime subscription with reconnect/focus refresh and periodic fallback; this synchronizes saved records without exposing another user's cached workspace.
- Workspace collection reads paginate in stable order and server requests run in batches of at most six; this avoids truncated figures and the published runtime's connection limit.
- Derive QR print counts from immutable tenant-scoped label-output history recorded through an authenticated idempotent database transaction; track print, PDF and PNG delivery once per selected asset, not previews or physical printer completion.
- Display per-asset QR history from that same output ledger and resolve names only through tenant-scoped authenticated profile reads; retain the initiator ID when a profile is unavailable to preserve attribution without privileged reads.
- Service request edits use an inline page with shared validation and tenant-scoped updated_at-checked saves; preserve asset, reporter, source and photo, reject stale saves, and keep the dialog read-only.
- Use one inline transfer form with shared validation; transfer edits lock the existing row, enforce tenant manager permissions and updated_at, preserve the asset and origin, reset approval, and record an asset event atomically.
- Transfer register, history and the Asset register's latest-transfer columns derive from live tenant-filtered transfers; completion stays in the assignment transaction, and current location/custodian come from the asset row so pending moves never look completed.
- Keep car registers tenant-private; active token-scoped public car reads explicitly project vehicle and owner-name fields only, and direct-number RPC execution stays revoked to prevent disclosure.
- QRmyCAR uses its own protected content route and the shared workspace cache and subscriptions; public reports use Sharvi-mediated messaging without direct owner phone links or visitor-number collection.
- QRmyCAR contact reasons share validation between public forms and tenant inbox filters; optional consent-based coordinates travel inside the saved message with validated map links, preserving existing public token identities.
- Scope the public car contact theme to its page and reuse persistent token contact actions and message validation; presentation changes must not imply an unconnected notification was delivered.
- Render car sticker previews, PDFs and print output from one client-side label renderer with shared validated settings and millimeter layout calculations, so selected dimensions and scaling match physical output without changing persistent QR identities.
- Category create/edit/delete run through authenticated server functions that derive the tenant from user_roles and restrict to manager roles; a database delete trigger blocks removing categories referenced by assets, because the asset foreign key would otherwise silently unlink them.
- Locations change through authenticated server functions that derive the tenant from user_roles and restrict to manager roles; referenced locations are deactivated, never deleted, and a database delete trigger blocks deleting any location still referenced because several foreign keys would otherwise silently unlink records. Inactive locations are filtered only from new choices through the shared selectableLocations helper.
