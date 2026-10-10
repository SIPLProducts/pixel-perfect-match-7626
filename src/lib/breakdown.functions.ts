import { createServerFn } from "@tanstack/react-start";
import { breakdownSchema, imageExtension, MAX_BREAKDOWN_PHOTO_BYTES } from "./breakdown-schema";

export const submitBreakdown = createServerFn({ method: "POST" })
  .inputValidator((input: FormData) => {
    if (!(input instanceof FormData)) throw new Error("Invalid report");
    return input;
  })
  .handler(async ({ data }) => {
    const report = breakdownSchema.parse({token:data.get("token"), title:data.get("title"), details:data.get("details")});
    const photo = data.get("photo");
    let bytes: Uint8Array | null = null;
    let ext: ReturnType<typeof imageExtension> = null;
    if (photo instanceof File && photo.size > 0) {
      if (photo.size > MAX_BREAKDOWN_PHOTO_BYTES) throw new Error("Choose a photo smaller than 5 MB");
      bytes = new Uint8Array(await photo.arrayBuffer());
      ext = imageExtension(bytes);
      if (!ext) throw new Error("Choose a JPEG, PNG or WebP photo");
    }
    // The opaque active QR token authorizes only reporting against this asset.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: qr, error } = await supabaseAdmin.from("asset_qr_codes").select("asset_id,organization_id").eq("token", report.token).eq("active", true).maybeSingle();
    if (error || !qr) throw new Error("This asset label is unavailable");
    const { count, error: countError } = await supabaseAdmin.from("maintenance_requests").select("id", {count:"exact", head:true}).eq("asset_id",qr.asset_id).eq("source","qr").gte("created_at",new Date(Date.now()-3600000).toISOString());
    if (countError) throw new Error("Reporting is temporarily unavailable");
    if ((count ?? 0) >= 10) throw new Error("Too many reports for this asset. Please try later");
    const photoPath = bytes && ext ? `${qr.organization_id}/${qr.asset_id}/${crypto.randomUUID()}.${ext}` : null;
    if (photoPath && bytes && ext) {
      const { error: uploadError } = await supabaseAdmin.storage.from("breakdown-photos").upload(photoPath, bytes, {contentType: ext === "jpg" ? "image/jpeg" : `image/${ext}`, upsert:false});
      if (uploadError) throw new Error("Photo could not be saved. Please retry");
    }
    const { data: requestId, error: saveError } = await supabaseAdmin.rpc("submit_qr_breakdown", {_token:report.token, _title:report.title, _remarks:report.details, _photo_path:photoPath ?? undefined});
    if (saveError || !requestId) {
      if (photoPath) await supabaseAdmin.storage.from("breakdown-photos").remove([photoPath]);
      throw new Error("Report was not saved. Please retry shortly");
    }
    return { requestId };
  });