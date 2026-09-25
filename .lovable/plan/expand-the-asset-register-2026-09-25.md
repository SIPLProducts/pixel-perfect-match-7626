# Expand the Asset register

## What will change
- Add clear Asset register columns for Serial Number, Plant, Company Code, Acquisition Value, and Book Value.
- Keep the existing Asset ID, name, category, location, installation date, age, and status information.
- Add filters for category, location, plant, company code, status, and installation-age band.
- Keep the existing text search and make it search the new fields too.
- Show the number of matching assets and provide a one-click reset for all filters.
- Ensure asset exports include the added business and valuation fields.
- Add Company Code and Plant inputs when registering a new asset so new records can be fully classified.
- Keep the table horizontally scrollable and usable on desktop and mobile.

## Technical details
- Add an optional company-code field to asset records through a safe database migration.
- Expand authenticated asset loading and creation validation for plant and company code.
- Apply all filtering locally to the loaded organization assets and retain organization-level access controls.
- Verify type safety and the production preview build after implementation.
