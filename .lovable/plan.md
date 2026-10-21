# Fix the invitation link on the "Set your password" page

## What is going wrong
- The sign-in logs show the invitation link worked: the person was signed in at 07:18:21 and again at 07:22:49.
- The page then threw the session away. It only checks the link's address for `type=invite` / `type=recovery` when Save is pressed. By then the sign-in step has already removed those details from the address, so every attempt shows "This recovery link is invalid or expired."
- Later clicks on the same email gave "Email link is invalid or has expired" (one-time token not found). Each link only works once, and some email scanners open links before the person does. Right now the page gives no clear message when this happens.

## Fix (only the reset-password page)
1. Read the link details (`type`, and any `error_code` / `error_description`) as soon as the page opens, before the sign-in step removes them.
2. Check the link through the verified session, not the address alone:
   - Wait for the session the link creates (the recovery event, or `getUser()`).
   - Allow the form only when a real session exists AND the link was an invite or a recovery.
   - Invites show "Set your password"; recoveries show "Choose a new password".
3. Show clear states:
   - Checking link
   - Link expired or already used: "Ask your administrator to resend the invitation" for invites, or a "Send a new link" button for recoveries
   - Form ready
4. After the password is saved, go to the dashboard. Workspace and role come from the existing membership, so nothing changes there.
5. Password recovery keeps working the same way. Self sign-up stays off. No security checks are weakened, and the database is not changed.

## Testing before I report it fixed
- Add an automated test for the link check: invite is accepted, recovery is accepted, an error or missing session is refused, and a plain visit is refused.
- Run the full flow in the browser, using a server-generated invite link for a test address and a recovery link (this needs your approval):
  1. Open the link
  2. See "Set your password"
  3. Set a password
  4. Land on the dashboard in the inviter's workspace
  5. Sign out and sign back in with the new password
- Confirm that a reused link shows the expired message.
- Run all existing tests and the type check.

## Technical details
- File: `src/routes/reset-password.tsx`. Capture the hash in a module-level snapshot or effect at first load.
- Use `supabase.auth.onAuthStateChange` (`PASSWORD_RECOVERY` / `SIGNED_IN`) plus `getUser()`.
- Small pure helper `parseAuthLink(hash, search)` in `src/lib/auth-link.ts`, with tests.
