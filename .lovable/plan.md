# Enable the Asset Transfers screen

## What will be built
- Replace the placeholder with a dedicated Transfers screen showing transfer totals and a searchable, status-filtered register.
- Add a “New transfer” form to select an asset, destination location, optional new custodian, transfer date, reason, and remarks.
- Automatically show the asset’s current location and custodian as the transfer source.
- Add transfer detail cards with asset ID/name, source and destination, custodian change, date, reason, and status.
- Allow authorized workspace managers to approve, reject, or complete pending transfers.
- When a transfer is completed, update the asset’s current location, custodian, and assignment status, and add an audit event.
- Refresh the Transfers screen and asset/dashboard figures immediately after each action, with clear success and error messages.
- Keep the existing Frosted Glass styling and make the screen usable on desktop and mobile.

## Technical details
- Add authenticated server functions with validated input for creating and progressing transfers.
- Verify organization membership and manager-level roles on the server before transfer actions.
- Expand transfer data loading to include source/destination locations and employees.
- Keep updates consistent by applying transfer completion, asset update, assignment history, and audit history together in a database function.
- Add the database function and permissions through a migration, retaining organization isolation and row-level security.
- Verify the build and the available signed-in workflow; if no test account exists, document that interactive validation remains blocked.
