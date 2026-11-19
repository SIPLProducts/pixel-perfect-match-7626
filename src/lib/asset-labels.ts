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

export const ASSET_PUBLIC_ORIGIN = "https://qrmyassets.siplproducts.com";

export function assetVerificationUrl(_origin: string, token: string) {
  // Printed labels must never encode an editor-only or localhost address.
  return new URL(`/a/${encodeURIComponent(token)}`, ASSET_PUBLIC_ORIGIN).href;
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

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

export async function buildLabelsPrintDocument(assets: LabelAsset[], size: LabelSize, organization: string) {
  if (!assets.length) throw new Error("Select at least one asset");
  const { width, height } = labelSizes[size];
  const pad = 5; // px padding on every side of the sticker
  const qrSize = `calc(${height}mm - ${pad * 2}px)`;
  const qrImages = await Promise.all(assets.map(labelQr));
  const pages = assets.map((asset, index) => {
    const lines = [organization, asset.name, asset.plant ? `Plant: ${asset.plant}` : "", asset.company_code ? `Company: ${asset.company_code}` : "", asset.capitalization_date ? `Capitalized: ${asset.capitalization_date.slice(0, 4)}` : ""].filter(Boolean);
    return `<article class="label"><div class="content"><img src="${qrImages[index]}" alt=""/><div class="details"><div class="asset-id">${escapeHtml(asset.asset_id)}</div>${lines.map(line => `<div class="meta">${escapeHtml(line)}</div>`).join("")}</div></div></article>`;
  });
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: ${width}mm ${height}mm; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    .label { width: ${width}mm; height: ${height}mm; padding: ${pad}px; display: flex; align-items: center; justify-content: center; overflow: hidden; break-after: page; page-break-after: always; }
    .label:last-child { break-after: auto; page-break-after: auto; }
    .content { display: flex; align-items: center; justify-content: center; gap: ${pad}px; max-width: 100%; max-height: 100%; }
    .content img { display: block; flex: none; width: ${qrSize}; height: ${qrSize}; }
    .details { min-width: 0; max-height: ${qrSize}; overflow: hidden; font-family: Arial, sans-serif; line-height: 1.2; color: #000; }
    .asset-id { font-size: ${size === "compact" ? 6 : 8}pt; font-weight: 700; overflow-wrap: anywhere; }
    .meta { margin-top: 0.5mm; font-size: ${size === "compact" ? 5 : 7}pt; overflow-wrap: anywhere; }
  </style></head><body>${pages.join("")}</body></html>`;
}

export function printLabelsInFrame(html: string) {
  return new Promise<void>((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;left:-10000px;top:0;width:100mm;height:60mm;border:0";
    let settled = false;
    const cleanup = () => frame.remove();
    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();
      reject(new Error(message));
    };
    const timer = window.setTimeout(() => fail("The print window did not open. Please use Download PDF instead."), 30000);
    frame.onload = () => {
      try {
        const printWindow = frame.contentWindow;
        if (!printWindow) throw new Error("Print frame unavailable");
        printWindow.focus();
        printWindow.print();
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        window.setTimeout(cleanup, 1000);
        resolve();
      } catch {
        fail("Your browser could not open the print window. Please use Download PDF instead.");
      }
    };
    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
}
