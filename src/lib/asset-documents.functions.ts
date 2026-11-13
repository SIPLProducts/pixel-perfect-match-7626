import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAppAuth } from "@/lib/app-auth";
import { documentInputSchema, validateDocumentFile, documentSignatureMatches } from "./asset-document-schema";

export const uploadAssetDocument = createServerFn({ method: "POST" })
  .middleware([requireAppAuth])
  .inputValidator((input: FormData) => {
    if (!(input instanceof FormData)) throw new Error("Invalid attachment");
    return input;
  })
  .handler(async ({ data, context }) => {
    const input = documentInputSchema.parse({ assetId: data.get("assetId"), documentType: data.get("documentType") });
    const file = data.get("file");
    if (!(file instanceof File)) throw new Error("Choose an attachment");
    const { ext, contentType } = validateDocumentFile(file);
    const { data: asset, error } = await context.supabase.from("assets").select("id,organization_id").eq("id", input.assetId).single();
    if (error || !asset) throw new Error("Asset not available in your workspace");
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!documentSignatureMatches(ext, bytes)) throw new Error("File contents do not match the selected document format");
    const id = crypto.randomUUID();
    const path = `${asset.organization_id}/${asset.id}/${id}`;
    const { error: uploadError } = await context.supabase.storage.from("asset-documents").upload(path, bytes, { contentType, upsert: false });
    if (uploadError) throw new Error("Attachment could not be uploaded. Please retry");
    const { error: saveError } = await context.supabase.from("asset_attachments").insert({ id, organization_id: asset.organization_id, asset_id: asset.id, document_type: input.documentType, file_name: file.name, content_type: contentType, file_size: file.size, storage_path: path, created_by: context.userId });
    if (saveError) {
      await context.supabase.storage.from("asset-documents").remove([path]);
      throw new Error("Attachment could not be linked. Please retry");
    }
    return { id };
  });

export const downloadAssetDocument = createServerFn({ method: "POST" })
  .middleware([requireAppAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: document, error } = await context.supabase.from("asset_attachments").select("storage_path,file_name").eq("id", data.id).single();
    if (error || !document) throw new Error("Attachment not available in your workspace");
    const { data: signed, error: signError } = await context.supabase.storage.from("asset-documents").createSignedUrl(document.storage_path, 300, { download: document.file_name });
    if (signError || !signed) throw new Error("Download is temporarily unavailable. Please retry");
    return { url: signed.signedUrl };
  });