import { z } from "zod";

export const documentTypes = [
  { id: "warranty", label: "Warranty certificate" },
  { id: "manual", label: "Equipment manual" },
  { id: "drawing", label: "Drawing" },
] as const;
export type DocumentType = typeof documentTypes[number]["id"];
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
export const DOCUMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.dwg,.dxf";
export const documentInputSchema = z.object({ assetId: z.string().uuid(), documentType: z.enum(["warranty", "manual", "drawing"]) });

export function validateDocumentFile(file: { name: string; size: number }) {
  if (file.size <= 0) throw new Error("Choose a non-empty file");
  if (file.size > MAX_DOCUMENT_BYTES) throw new Error("Each attachment must be 20 MB or smaller");
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const types: Record<string, string> = {
    pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
    doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    dwg: "application/acad", dxf: "application/dxf",
  };
  const contentType = types[ext];
  if (!contentType) throw new Error("Choose a PDF, image, Office document, DWG or DXF drawing");
  if (file.name.length > 255) throw new Error("Use a file name shorter than 256 characters");
  return { ext, contentType };
}

export function documentSignatureMatches(ext: string, bytes: Uint8Array) {
  const starts = (...prefix: number[]) => prefix.every((v, i) => bytes[i] === v);
  if (ext === "pdf") return starts(37, 80, 68, 70, 45);
  if (ext === "jpg" || ext === "jpeg") return starts(255, 216, 255);
  if (ext === "png") return starts(137, 80, 78, 71, 13, 10, 26, 10);
  if (ext === "webp") return starts(82, 73, 70, 70) && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (["docx", "xlsx", "pptx"].includes(ext)) return starts(80, 75, 3, 4);
  if (["doc", "xls", "ppt"].includes(ext)) return starts(208, 207, 17, 224, 161, 177, 26, 225);
  if (ext === "dwg") return new TextDecoder().decode(bytes.slice(0, 6)).match(/^AC10\d\d$/) !== null;
  if (ext === "dxf") return /^\s*0\s+SECTION\b/.test(new TextDecoder().decode(bytes.slice(0, 200))) || new TextDecoder().decode(bytes.slice(0, 18)) === "AutoCAD Binary DXF";
  return false;
}