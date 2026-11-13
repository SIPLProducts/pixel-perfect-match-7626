import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mustChangePassword, PASSWORD_CHANGE_REQUIRED } from "@/lib/user-management";

/**
 * Authenticated middleware for every protected server function. It adds one check on top of the
 * generated session check: accounts flagged by an administrator (server-only app_metadata, which
 * users cannot edit) are refused until they finish the first-login password change.
 */
export const requireAppAuth = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    if (mustChangePassword(context.claims)) throw new Error(PASSWORD_CHANGE_REQUIRED);
    return next();
  });
