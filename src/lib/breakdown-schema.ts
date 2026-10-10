import { z } from "zod";

export const breakdownSchema = z.object({
  token: z.string().uuid(),
  title: z.string().trim().min(3, "Enter a short breakdown summary").max(160),
  details: z.string().trim().min(10, "Enter at least 10 characters of breakdown details").max(2000),
});
export const MAX_BREAKDOWN_PHOTO_BYTES = 5 * 1024 * 1024;
export function imageExtension(bytes: Uint8Array): "jpg" | "png" | "webp" | null {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpg";
  if ([137,80,78,71,13,10,26,10].every((v, i) => bytes[i] === v)) return "png";
  if (String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP") return "webp";
  return null;
}