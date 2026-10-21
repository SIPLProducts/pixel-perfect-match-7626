# User Management & Access Control

## 1. What the inspection found
- **Accounts:** existing sign-in (email/password, Google, reset password). Self sign-up is already off on the backend, so the "Create an account" link on the sign-in page only produces an error.
- **Memberships:** 5 users, each Super admin of their own "Sharvi Infotech Demo" workspace. Roles live only in the separate role table, one row per person per workspace.
- **Already in the database (verified):**
  - The `client_tester` role value and an `active` flag on memberships (all true).
  - The membership and role checks already count active memberships only.
  - A workspace-users listing function that answers only active Super admins and Admins, and only for their own workspace.
- **How permissions are enforced today (verified in the server code and security rules):**
  - Database security rules: any active member of the workspace may read and write assets, QR codes, transfers, service requests, attachments, cars and messages, and may read master data.
  - Exception: Excel template links are limited to Super admin, Admin and Asset manager. This rule does not yet check `active` (a gap, fixed in section 4).
  - Server checks on top:
    - Categories: Super admin, Admin, Asset manager.
    - Locations and Employees: those three plus Facility manager.
    - Transfers (create, edit, approve): those four plus IT manager.
  - All other roles (Finance, Auditor, Employee, Viewer, Client tester) can view everything and can add or edit assets, service requests and QRmyCAR, but cannot manage master data or transfers.
  - Correction to the earlier plan: Client testers can view transfers but cannot create them.
- **No Users screen** exists; there is no way to invite, edit or deactivate anyone.

## 2. What the user will see
A new **Users & Access** page under the sidebar's Control group, visible to Super admins and Admins only. Title, short description, four summary cards (Total users, Active, Invited, Deactivated) and three tabs.

**Users tab**
- Table: name, email, role badge, status badge (Active / Invited / Deactivated), last sign-in.
- Search plus Role and Status filters.
- **Invite user** dialog: full name, email, role. The person receives an email link to set their own password on the existing reset-password page. Passwords are never typed, shown or stored by the app.
- **Edit** (name, role) and **Deactivate / Reactivate**, each with a confirmation dialog.
- Loading, empty, validation, success and error states in the existing styles.

**Roles tab**
- One card per existing role (Super admin, Admin, Asset manager, Facility manager, IT manager, Finance, Auditor, Employee, Viewer, Client tester).
- Each shows a description, a "System role" badge (custom roles are not supported), the number of users with that role, a short permission summary, and **View permissions**, which opens that role's column from the matrix.

**Matrix tab**
- Rows: Dashboard, Assets, QR labels, Excel import/export, Categories, Locations, Employees, Transfers, Transfer approval, Service requests, QRmyCAR, Reports, Users & Access.
- Columns: each role, with View and Edit checks or crosses, scrolling sideways on small screens.
- **Read-only.** It shows exactly what the server and database enforce. Changing it from the screen is not offered: roles are fixed in the server checks, and editable permissions would need a new permission store plus rewritten security rules across every module, which this request asks not to touch.

## 3. Permission rules for user management (server and database)
- Super admins can invite and manage anyone in their own workspace.
- Admins can manage all roles except Super admin and Admin.
- Nobody can change their own role or deactivate themselves.
- Each workspace always keeps at least one active Super admin.
- The workspace is always taken from the signed-in admin's own active membership, never from the browser.
- **Deactivated people:**
  - The membership and role checks count active memberships only, so their reads and writes are refused immediately, even with an open session.
  - Their account is also blocked from signing in again.
  - The app shows "Your access has been deactivated" and signs them out.
- **Existing people:** a person who already has any membership, even an inactive one, never gets a new workspace auto-created.

## 4. Database changes (additive, reversible)
1. Update the membership and role check functions to require an active membership. Every existing security rule uses them, so no rule is rewritten or loosened.
2. Verify the existing workspace-users listing function only answers active Super admins and Admins of the caller's workspace; tighten it if not.

Nothing is dropped or renamed, and no asset, category, QR, transfer or SAP data changes. To undo: restore the two check functions.

## 5. Code changes
- `src/lib/user-management.ts` (new): invite/edit form checks, the role catalogue (descriptions, summaries) and the permission matrix, taken from the same manager-role lists the server uses, plus the rules for which roles each admin may assign, self-change and last Super admin.
- `src/lib/user-management.functions.ts` (new): authenticated `listUsers`, `inviteUser`, `updateUser`, `setUserActive`.
  - Each checks the caller's active role first.
  - Privileged account steps (invite email, ban/unban) load inside the handler only after that check.
- `src/components/asset360/users.tsx` (new): the page with the three tabs, using existing table, card, badge, tabs and dialog components.
- `src/components/asset360/workspace.tsx`: Users & Access menu item for admins, deactivated message.
- `src/lib/asset360.functions.ts`: read active memberships only; no auto-workspace for anyone with a membership.
- `src/routes/auth.tsx`: remove the broken "Create an account" option. Sign-in, Google and password reset stay.
- `AGENTS.md`: one user-administration rule.

Not touched: asset forms (With/Without SAP), QR, Categories/Locations/Employees, Transfers, Service requests, Reports, Excel, SAP placeholders.

## 6. Tests
- **Automated:**
  - Which roles each admin may assign; Admin cannot assign Admin or Super admin.
  - Self-change refused; last Super admin protected.
  - Invite form validation.
  - The matrix matches the server's manager-role lists.
- **Database checks:**
  - A deactivated member's reads and writes are refused.
  - A Client tester is refused manager actions.
  - An admin cannot list or change another workspace's users.
- **Existing tests and typecheck:** the full set, with the actual results reported.
- **Browser (signed in as Super admin):**
  - Open all three tabs and filter users.
  - Invite a test address, edit it, deactivate it, then reactivate it.
  - Regression check of Add Asset (both modes) and Categories.
- **Limitation:** I can't open a real inbox, so a person must confirm the invitation email arrives.

Nothing will be published automatically.
