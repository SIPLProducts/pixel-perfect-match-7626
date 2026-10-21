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

**Roles tab** (read-only)
- One card per existing role (Super admin, Admin, Asset manager, Facility manager, IT manager, Finance, Auditor, Employee, Viewer, Client tester).
- Each shows a description, a "System role" badge (custom roles are not supported), the number of users with that role, a short permission summary, and **View permissions**, which opens that role's column from the matrix.

**Matrix tab** (read-only)
- Rows: Dashboard, Assets, QR labels, Excel import/export, Categories, Locations, Employees, Excel template links, Transfers, Service requests, QRmyCAR, Reports, Users & Access.
- Columns: each role, with View and Edit checks or crosses, scrolling sideways on small screens.
- There are no editable permission controls. The backend has no secure way to change permissions per role: they are fixed lists in the server code and fixed security rules.

### How the displayed permissions match what is enforced
- **One source.** The matrix is built from the same role lists the server already uses: the category, location, employee and transfer lists. It is not a separate copy, so the screen cannot drift from the checks.
- **Database rules** are represented as fixed facts:
  - "any active member may view/edit" for assets, QR, service requests and QRmyCAR;
  - "view only" for master data unless the role is in the list;
  - the template-link rule's three roles.
- **An automated test** compares the template-link list to the live security rule's role set, and asserts each matrix cell against the server lists.
- **A database check** confirms that one non-manager role (Client tester) is refused on each manager action, and allowed on asset editing, exactly as the matrix shows.
- **Users & Access:** Super admin and Admin only, the same as the listing function and the new server checks.

## 3. Invitations and password setup (verified against current settings)
- **Self sign-up:** confirmed off on the backend (sign-up attempts fail with "Signups not allowed"). It stays off.
- **Inviting another Super admin:**
  - An active Super admin can choose the Super admin role in the invite form. Admins can't, and the server refuses it from them.
  - The invitee joins the inviter's existing workspace with the Super admin role and the same permissions.
  - No new workspace is created.
  - Verified after building by inviting a test Super admin and confirming they share the inviter's workspace, data and Users page.
- **Invitations work with sign-up off:**
  - The invite is sent by a server action using the backend's privileged invite feature. That feature is not affected by the self sign-up setting.
  - The action first confirms the caller is an active Super admin or Admin.
- **Order of steps in one invite:**
  1. Check the email isn't already a member of this workspace.
  2. Send the invitation, which creates the account.
  3. Create the profile with the given name.
  4. Add the membership with the chosen role in the caller's own workspace, taken from their active membership on the server.
  5. If step 3 or 4 fails, the new account is removed, so no orphan account is left behind.
- **Wrong workspace is impossible:** the invited person already has a membership, so the automatic workspace creation on first sign-in never runs for them. This is enforced in section 5.
- **Password setup — gap found:**
  - The current reset-password page accepts only password-recovery links, so it would reject an invitation link.
  - The plan updates that page to also accept invitation links and show "Set your password".
  - Existing reset behaviour is unchanged.
- **Email delivery:**
  - No custom email domain is set up, so invitation emails come from the default built-in sender, which has an hourly limit.
  - Re-sending an invite to an Invited user is supported.
- **Google:** an invited person may also sign in with Google using the same email. Unknown emails cannot create accounts.
- **What I'll verify after building:**
  - Invite a test address: the account, profile and membership are created in the right workspace with the right role.
  - Generate that user's invite link on the server, open it in the browser, set a password, and sign in.
  - **Limitation:** a person must confirm the email actually arrives in a real inbox.

## 4. Permission rules for user management (server and database)
- Super admins can invite and manage anyone in their own workspace.
- Admins can manage all roles except Super admin and Admin.
- Nobody can change their own role or deactivate themselves.
- Each workspace always keeps at least one active Super admin.
- The workspace is always taken from the signed-in admin's own active membership, never from the browser.
- **Deactivated people:**
  - The membership and role checks already count active memberships only, so their reads and writes are refused immediately, even with an open session.
  - Their account is also blocked from signing in again.
  - The app shows "Your access has been deactivated" and signs them out.
- **Existing people:** a person who already has any membership, even an inactive one, never gets a new workspace auto-created.

## 5. Database changes (additive, reversible)
1. Add an `active` check to the Excel template-link security rule, the only rule that reads roles directly. Its role set stays the same.

The membership checks and listing function already meet the requirements, so they aren't changed. Nothing is dropped or renamed, and no asset, category, QR, transfer or SAP data changes. To undo, restore that one rule.

## 6. Code changes
- `src/routes/reset-password.tsx`: also accept invitation links ("Set your password").
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

## 7. Tests
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
