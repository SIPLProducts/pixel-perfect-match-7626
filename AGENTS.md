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
- Generate asset labels client-side from existing persistent QR tokens through the shared label utility and dialog; fixed millimeter PDF layouts preserve physical printing dimensions without duplicating QR identities.
- All printable and downloadable QR labels use the canonical public asset origin rather than the current browser origin, so labels generated in preview remain accessible without editor authentication.
- Use one inline asset form and shared validation for creation and editing; edits update the existing asset row without replacing its asset ID or QR identity.
- Store ERP register values in typed asset columns and share field metadata across the inline form and display; external asset numbers and location codes never replace application IDs or workspace references.
- Asset attachments use private tenant-and-asset-scoped storage, authenticated upload validation and fresh signed downloads; retrying failed attachments reuses the saved asset rather than creating another row.
- Parse Excel workbooks only in the browser and validate preview rows with the shared asset schema; bulk imports use an authenticated, tenant-scoped transaction to create assets and persistent QR tokens together without overwriting existing records.
- QR breakdown submissions derive asset and tenant identity from an active persistent token server-side; a restricted transaction records requests and events, and private photos are visible only to workspace members through expiring links.
- All workspace views share a user-keyed Query cache and a tenant-filtered Realtime subscription with reconnect/focus refresh and periodic fallback; this synchronizes saved records without exposing another user's cached workspace.
- Workspace collection reads paginate in stable order and server requests run in batches of at most six; this avoids truncated figures and the published runtime's connection limit.
