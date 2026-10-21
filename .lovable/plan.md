# User Management and Client Testing Access

## 0. Confirmations requested before building
1. **Existing data is preserved.** The database currently holds 5 users. Each one is the Super admin of their own "Sharvi Infotech Demo" workspace: four workspaces have 54 assets each and one has 55. No user, workspace, role, tenant link or record will be merged, recreated, reset or reassigned. Every existing membership stays active because the new active setting defaults to true.
   - **How the admin's workspace is identified:** never by a chosen ID or by name. On the server, it is always the workspace of whoever is signed in. For example, if bala@sharviinfotech.com invites a tester, the tester joins bala's workspace (9e1709ca…).
   - **Your choice:** tell me which account should host client testing. Otherwise any Super admin can invite into their own workspace.
2. **Deactivated users are blocked even with an open session.**
   - Every database security rule goes through `is_org_member` and `has_role`. Both will require an active membership, so a deactivated person's reads and writes are refused straight away, with no waiting for sign-out.
   - Every protected server action also reads only active memberships before doing anything.
   - The account is additionally blocked from signing in again.
   - Being signed out is only the visible result, not the protection.
3. **Invitation and password setup** use the existing sign-in setup and the existing reset-password page.
   - **What I will check:** that the invitation call succeeds, that the account and membership are created in the right workspace, that the invite link lands on the password page, and that the new password then signs in.
   - **Limitation:** I can't open a real inbox, so whether the email actually arrives must be confirmed by a person on a real invite.
4. **Client Tester follows the existing permission system.**
   - It is a new value in the same role list and has no extra rights.
   - User management accepts Super admin and Admin only.
   - Master data and transfer approval keep using their existing manager-role lists, and Client Tester isn't in them.
   - Tests will confirm that each of these is refused.
5. **Migrations are additive and reversible.**
   - The database changes are: a new role value, a new column with a default, a new function, and two updated check functions. Nothing is dropped, renamed or rewritten.
   - **Undo steps:** put the two check functions back to their old form and turn self sign-up back on.
   - **Testing:** the existing test set, the typecheck, and the security and regression checks in section 8 will be run, and the actual results reported. Nothing will be published.


## 1. Findings from the inspection
- **Sign-in:** the app uses its existing Cloud accounts. People can sign in with email and password, with Google, or reset a forgotten password through the reset page. Anyone can sign up themselves today.
- **Workspace:** a person's workspace and role come only from the `user_roles` table. If someone signs in with no role, `bootstrapWorkspace` makes a brand-new "Sharvi Infotech Demo" workspace and makes them its `super_admin`. This is why the database has 5 users in 5 separate workspaces, each one a super_admin. If an invited person signed in under today's rules, they would get their own empty workspace instead of joining yours. Fixing this is the main gap.
- **Roles:** the existing role list is super_admin, admin, asset_manager, finance, it_manager, facility_manager, auditor, employee and viewer. Users can read only their own role rows, and nobody can add or change roles from the app. Manager-only actions check the role on the server: categories, locations, employees and transfer approval.
- **Data security:** every workspace table allows access through `is_org_member(organization_id)`, so any member can read and write assets, transfers and service requests. Profiles are visible to other members of the same workspace.
- **No deactivation:** there is no way to deactivate an account today. A removed person would keep access until their session runs out.
- **Missing screen:** there is no user list or Administration screen. The Settings page shows read-only organization details.

## 2. What the user will see
- **Users page:** a new "Users" item appears under the sidebar's Control group. Only Super admins and Admins can see it.
  - A searchable table with name, email, role, status (Active, Invited or Deactivated) and last sign-in.
  - **Invite user** opens a form for full name, email and role. The person gets an email with a link to set their own password. No passwords are typed, shown or stored by the app.
  - **Edit** lets you change the name and role. **Deactivate** and **Reactivate** each ask for confirmation first.
  - The page shows loading, empty, field-error, success and failure messages, using the existing table and form styles.
- **New role, "Client Tester":** testers can do the same as asset staff. They can sign in and add or edit assets, transfers and service requests. They cannot see Users, cannot change categories, locations or employees, and cannot approve transfers.
- **Sign-up turned off:** the "Create account" option is removed from the sign-in page. New people can join only through an invitation, so testers can no longer create their own workspace.
- **Blocked account:** a deactivated person sees "Your access has been deactivated" and is signed out. They lose access to data straight away, even if they were still signed in.

## 3. Permission rules (checked on the server and in the database)
- Super admins can invite and manage anyone in their own workspace.
- Admins can manage every role except Super admin and Admin.
- Nobody can change their own role or deactivate themselves.
- Each workspace always keeps at least one active Super admin.
- The workspace is always taken from the signed-in admin's own membership on the server. It is never taken from the browser, so nobody can reach another workspace's users.

## 4. Database changes (additive, reversible)
1. Add the role value `client_tester` to the existing role list.
2. Add an `active` column to `user_roles` (default true), so every current member stays active.
3. Update `is_org_member` and `has_role` to count active memberships only. Every existing security rule uses these two checks, so deactivation applies everywhere without rewriting any rules. No existing rule is loosened.
4. Add a new members-only function that returns the people in the caller's workspace with their email, status and last sign-in. It works only for active Super admins and Admins of that workspace.

No asset, category, QR, transfer or SAP data changes.

## 5. Code changes
- `src/lib/user-management.ts` (new): the shared form checks and permission rules, including which roles each person may assign and the self-change and last-Super-admin rules.
- `src/lib/user-management.functions.ts` (new): authenticated server functions `listUsers`, `inviteUser`, `updateUser` and `setUserActive`.
  - Each one first checks on the server that the caller's role allows the action.
  - Privileged account steps load only inside the handler, after that check: the invitation email, setting a role, and blocking or unblocking the account.
  - The invitation link returns to the existing reset-password page.
- `src/components/asset360/users.tsx` (new): the Users page.
- `src/components/asset360/workspace.tsx`:
  - Add the Users item to the menu and route it to the Users page, for admins only.
  - Show the "deactivated" message.
- `src/lib/asset360.functions.ts`:
  - Read only active memberships.
  - Never create a new workspace for someone who already has any membership, even an inactive one.
- `src/routes/auth.tsx`: remove the self sign-up option. Sign-in, Google and password reset stay.
- Turn off self sign-up in the sign-in settings. Existing accounts keep working.
- `AGENTS.md`: one rule for user administration.

## 6. Creating a client testing account
1. Sign in as a Super admin and open **Users**.
2. Click **Invite user**, then enter the tester's name and their own email, and choose **Client Tester**.
3. The tester gets an email, sets their own password and lands in your demo workspace. That workspace already holds clearly marked sample data, such as `@sharvi.demo` employees.
4. When testing ends, click **Deactivate**. Access stops at once and the history stays.

No accounts or data are created automatically.

## 7. Risks and assumptions
- **Invitation emails:** they use the built-in sign-in emails, which have hourly sending limits. A custom sending domain can be added later if needed.
- **Google sign-in:** Google works only for invited emails, because new accounts can't be created by signing in.
- **Old users without a role:** existing users who have no role keep their current behaviour. All 5 current users already have a role.
- **Undoing it:** reactivate the users, restore the two check functions to their old form, then turn self sign-up back on. The extra column and role value are harmless if left in place.

## 8. Test plan
- **Automated tests:**
  - Which roles each person may assign.
  - Admins cannot assign Admin or Super admin.
  - Nobody can change their own role or status.
  - The last-Super-admin rule.
  - Invite form checks.
- **Database checks:**
  - A deactivated member's reads and writes are rejected.
  - A Client Tester can't call manager actions.
  - An admin cannot list or change another workspace's users.
- **Existing tests and typecheck:** the full current test set plus a typecheck.
- **In the browser:**
  - As an admin: open Users, invite a tester, edit them, deactivate them, then reactivate them.
  - As the tester: Users is hidden, adding an asset works, and changing master data is refused. After deactivation the tester is blocked.
  - The Add Asset modes (With SAP and Without SAP), QR scanning and Excel import still work as before.
- Actual results will be reported after the build, and nothing will be published automatically.
