import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { serviceRequestSchema, serviceRequestValues } from "./service-request-schema";

export const updateServiceRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => serviceRequestSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: membership, error: membershipError } = await context.supabase.from("user_roles")
      .select("organization_id").eq("user_id", context.userId).eq("active", true).limit(1).maybeSingle();
    if (membershipError || !membership) throw new Error("Workspace access required");
    const { data: request, error } = await context.supabase.from("maintenance_requests")
      .update(serviceRequestValues(data)).eq("id", data.requestId)
      .eq("organization_id", membership.organization_id).eq("updated_at", data.expectedUpdatedAt)
      .select("id,status,updated_at").maybeSingle();
    if (error) throw new Error("Could not save this service request. Please try again.");
    if (!request) throw new Error("This request has changed or is no longer available. Close the editor and reopen the refreshed request.");
    return request;
  });