import QRCode from "qrcode";
import { jsPDF } from "jspdf";

export type LabelAsset = {
  id: string;
  asset_id: string;
  name: string;
  plant: string | null;
  company_code: string | null;
  serial_number: string | null;
  capitalization_date: string | null;
  asset_qr_codes: { token: string } | null;
};

export const labelSizes = {
  compact: { name: "Compact · 50 × 30 mm", width: 50, height: 30 },
  standard: { name: "Standard · 70 × 40 mm", width: 70, height: 40 },
  large: { name: "Large · 100 × 60 mm", width: 100, height: 60 },
} as const;
export type LabelSize = keyof typeof labelSizes;

export function assetVerificationUrl(origin: string, token: string) {
  return new URL(`/a/${token}`, origin).href;
}

export async function labelQr(asset: LabelAsset) {
  if (!asset.asset_qr_codes?.token) throw new Error(`${asset.asset_id} has no QR token`);
  return QRCode.toDataURL(assetVerificationUrl(window.location.origin, asset.asset_qr_codes.token), { width: 600, margin: 4, errorCorrectionLevel: "M" });
}

export async function buildLabelsPdf(assets: LabelAsset[], size: LabelSize, organization: string) {
  if (!assets.length) throw new Error("Select at least one asset");
  const { width, height } = labelSizes[size];
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const margin = 10, gap = 3;
  const columns = Math.floor((210 - margin * 2 + gap) / (width + gap));
  const rows = Math.floor((297 - margin * 2 + gap) / (height + gap));
  const perPage = columns * rows;
  for (let index = 0; index < assets.length; index++) {
    const asset = assets[index];
    if (!asset) continue;
    if (index > 0 && index % perPage === 0) pdf.addPage();
    const position = index % perPage;
    const x = margin + (position % columns) * (width + gap);
    const y = margin + Math.floor(position / columns) * (height + gap);
    const qrSize = height - 8;
    pdf.rect(x, y, width, height);
    pdf.addImage(await labelQr(asset), "PNG", x + 2, y + 4, qrSize, qrSize);
    const textX = x + qrSize + 4, textWidth = width - qrSize - 6;
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(size === "compact" ? 6 : 8);
    pdf.text(pdf.splitTextToSize(asset.asset_id, textWidth), textX, y + 6);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(size === "compact" ? 5 : 7);
    const lines = [organization, asset.name, asset.plant ? `Plant: ${asset.plant}` : "", asset.company_code ? `Company: ${asset.company_code}` : "", asset.capitalization_date ? `Capitalized: ${asset.capitalization_date.slice(0, 4)}` : ""].filter(Boolean);
    let textY = y + 11;
    for (const line of lines) {
      const wrapped = pdf.splitTextToSize(line, textWidth) as string[];
      const maxLines = Math.floor((y + height - 2 - textY) / 3);
      if (maxLines <= 0) break;
      const visible = wrapped.slice(0, maxLines);
      pdf.text(visible, textX, textY); textY += visible.length * 3 + 1;
    }
  }
  return pdf;
}