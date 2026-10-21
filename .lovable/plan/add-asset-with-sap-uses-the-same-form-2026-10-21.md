# Add Asset: With SAP uses the same form

## Current state (inspected)
- The Add Asset form groups its fields into: Asset identification, Location & ownership, Value & lifecycle, ERP identification, Depreciation & life, Financial movements, Additional references, Attachments and Remarks.
- The Without SAP / With SAP switch is already next to "Back to assets", and it only appears when adding a new asset.
- Right now, With SAP replaces the whole form with a separate panel. The panel has a code dropdown and a read-only list of details.
- The SAP connection point gives back free label/value pairs. They do not match the form's own fields, and the connection is marked "not configured".

## What the user will see
- **Without SAP:** no change at all. Same fields, checks, saving, asset IDs and QR codes.
- **With SAP:** the same form, with the same sections, labels, layout and styling. Above the first section there is a new row: a searchable **SAP Asset Code** dropdown.
  - **Not connected yet:** a notice says "SAP connection is not configured yet." The full form stays visible underneath.
  - **Searching:** the dropdown shows "Searching SAP…", "No matching asset codes", or an error with a Retry button.
  - **After picking a code:** a loading line appears while details load. Then the matching form fields fill in from SAP and lock (read-only, with a small "From SAP" tag). Only fields SAP actually returned get filled. Nothing is guessed. If loading fails, an error with Retry appears.
  - **Fields SAP does not provide:** they stay visible and editable, e.g. location, custodian, attachments and remarks. This follows the default rule for now: anything not supplied by SAP is entered manually. It can be tightened once the business rules are agreed.
  - **Changing the code:** a different code clears the earlier SAP values and fills in the new ones. A "Clear SAP selection" button unlocks the fields.
  - **No saving:** With SAP has no "Register asset" button. A note says "Saving SAP assets will be enabled once the save workflow is confirmed." Picking a code never saves anything.
- **Switching modes** keeps the two separate. If there are unsaved entries, the existing "Discard unsaved changes?" check appears first. Each switch starts with a clean form.
- Edit Asset is unchanged and still has no switch.

## Changes
1. **SAP connection point** (`src/lib/sap-asset-source.ts`)
   - Change `getDetails(code)` so it returns values keyed by the form's own field names, plus the list of fields SAP filled. The mapping from SAP's fields to the form lives only here.
   - It stays "not configured" until the API team connects it. There is no sample data.
2. **Add Asset form** (`src/components/asset360/asset-form.tsx`)
   - In SAP mode, keep showing the same form, with the SAP code row on top.
   - Track which fields came from SAP and make those inputs and dropdowns read-only.
   - Hide the save button in SAP mode and stop the form from submitting.
   - Manual mode follows exactly the same path as today.
3. **SAP code picker** (`src/components/asset360/sap-asset-entry.tsx`)
   - Reduce it to just the dropdown and its loading, empty, error and not-configured states. It hands the chosen code's mapped values back to the form.
   - Remove the separate details panel.
4. **Tests** (`src/lib/sap-asset-source.test.ts`)
   - The unconfigured source returns no codes and no values.
   - A new mapping helper drops any SAP field that has no matching form field, so only correctly mapped fields fill in.
5. **AGENTS.md:** update the existing SAP rule. SAP lookup fills the shared asset form through the connection point, SAP-supplied fields are read-only, and SAP mode never saves until the save workflow is approved.

## Not changed
- Database, existing records, asset ID and QR generation, validation rules, server functions, Excel import/export, Edit Asset and other modules.
- Duplicate protection for SAP saves is part of the future save step. It will be designed together with the API contract, for example by checking whether that SAP code is already registered.

## Still needed from the API team
- Endpoint address and login method.
- Search and details response formats, and how SAP fields map to the form.
- Which fields, if any, may stay editable.
- The save workflow and duplicate rule.

## Verification
- Typecheck and all tests.
- Signed-in browser check on desktop and mobile:
  - Without SAP registers a test asset as before.
  - With SAP shows every section and field, the not-configured notice and no save button.
  - Edit Asset shows no switch.
- The "fills only mapped fields" behaviour is checked by the automated test. There is no live SAP to test against.
