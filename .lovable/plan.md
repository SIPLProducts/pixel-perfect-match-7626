# Add Asset: "With SAP" and "Without SAP" workflows

## What was inspected
- The Add Asset page is the inline form in `src/components/asset360/asset-form.tsx`. Its top bar (line 74) holds "Back to assets" on the left and the asset code ("New asset") on the right. The same form is used for Edit Asset.
- Saving goes through `createAsset` / `updateAsset` with the shared `assetSchema`. Asset IDs and QR tokens are generated on the server. The project has no SAP endpoint or SAP code yet.

## What the user will see
- On **Add Asset only**, a two-option switch sits next to "Back to assets": **Without SAP** (selected by default) and **With SAP**. It uses the existing button styles. On phones it wraps under the back button and spans the full width.
- **Without SAP:** the current form, exactly as it is today. Fields, validation, saving, attachments, asset IDs and QR codes stay the same.
- **With SAP:** a separate panel takes the form's place:
  - A searchable "SAP Asset Code" dropdown.
  - Once a code is picked, a read-only details area shows the details SAP returns.
  - Loading, error (with Retry) and "No matching asset codes" states.
  - The panel has no save button. A note says: "Saving SAP assets will be enabled once the save workflow is confirmed."
  - Until the other team's API is connected, the panel shows: "SAP connection is not configured yet." No sample codes or invented data appear.
- Switching between the two keeps them separate. If the manual form has unsaved changes, the existing "Discard unsaved changes?" confirmation appears first.
- Edit Asset does not show the switch and works as before.

## Changes (exact files)
1. `src/components/asset360/asset-form.tsx`
   - Add a `mode` state (`"manual" | "sap"`, default `"manual"`) and render the switch next to "Back to assets" only when `asset` is null.
   - When `mode === "sap"`, render `<SapAssetEntry />` instead of the `<form>`. The manual form's code path is otherwise untouched.
2. `src/components/asset360/sap-asset-entry.tsx` (new)
   - Searchable dropdown built from the existing shadcn Command/Popover parts, a debounced search, and React Query calls for code search and details.
   - Renders the not-configured, loading, error, empty and details states. It does not write anything.
3. `src/lib/sap-asset-source.ts` (new): the single place where the API connects.
   - A `SapAssetSource` interface with `searchCodes(query)` returning `{ code, label }[]` and `getDetails(code)` returning a list of `{ label, value }` rows.
   - The default export is a "not configured" source that reports `configured: false`. Connecting the API later means filling in this one file (endpoint and response mapping), or adding a server function it calls if the API needs a secret key. No UI changes are needed.
4. `src/lib/sap-asset-source.test.ts` (new): one test confirming the default source is not configured and returns no codes. This prevents invented data.
5. `AGENTS.md`: one rule saying SAP asset lookups go only through the `SapAssetSource` adapter, are read-only until a save workflow is approved, and stay separate from manual asset creation.

## Not changed
Database tables and records, asset ID or QR generation, `assetSchema`, server functions, Excel import, edit flow, and all other modules.

## Open items for later (needs the other team's API contract)
- Endpoint URL, authentication, the search and details response formats, and how SAP fields map to the details shown.
- Confirmation of the save workflow before any SAP asset can be saved.

## Verification after build
Typecheck and the existing tests, plus the new test. Then a signed-in browser check on desktop and mobile:
- "Without SAP" registers an asset exactly as before.
- "With SAP" shows the not-configured state and offers no save.
- Edit Asset shows no switch.
