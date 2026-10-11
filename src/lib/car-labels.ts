import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { ASSET_PUBLIC_ORIGIN } from "./asset-labels";
import { carLabelLayout, defaultCarLabelSettings, type CarLabelSettings } from "./car-label-settings";
export function carContactUrl(token: string) { return new URL(`/car/${encodeURIComponent(token)}`, ASSET_PUBLIC_ORIGIN).href; }
export const carQr = (token: string) => QRCode.toDataURL(carContactUrl(token), { width: 800, margin: 4, errorCorrectionLevel: "M" });
export const carLabelSize = { width: 80, height: 96 } as const;
type LabelCar = { registration_number: string; qr_token: string };

export async function carLabelImage(car: LabelCar, settings: CarLabelSettings = defaultCarLabelSettings) {
 const layout = carLabelLayout(settings);
 const qr = new Image();
 qr.src = await carQr(car.qr_token);
 await qr.decode();
 const canvas = document.createElement("canvas");
 const units = 20;
 canvas.width = Math.round(layout.width * units); canvas.height = Math.round(layout.height * units);
 const ctx = canvas.getContext("2d");
 if (!ctx) throw new Error("Could not prepare the label");
 ctx.scale(units, units);
 const tokens = getComputedStyle(document.documentElement);
 const color = (name: string) => tokens.getPropertyValue(`--car-label-${name}`).trim();
 const rounded = (x: number, y: number, w: number, h: number, r: number, fill: string) => {
  ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
 };
 const { width, height, margin, panel, qr: qrBox } = layout;
 const base = Math.min(width, height);
 rounded(0, 0, width, height, base * 0.1, color("background"));
 ctx.textAlign = "center"; ctx.fillStyle = color("accent");
 const text = (value: string, size: number, y: number, bold = false, maxWidth = width - margin * 2) => {
  let fitted = size;
  ctx.font = `${bold ? "bold " : ""}${fitted}px Arial, sans-serif`;
  const measured = ctx.measureText(value).width;
  if (measured > maxWidth) {
   fitted *= maxWidth / measured;
   ctx.font = `${bold ? "bold " : ""}${fitted}px Arial, sans-serif`;
  }
  ctx.fillText(value, width / 2, y);
 };
 const brandSize = Math.min(base * 0.035, height * 0.035) * settings.brandingScale / 100;
 text("Sharvi's QRmyAssets", brandSize, height * 0.055);
 text("SCAN TO", Math.min(base * 0.085, height * 0.075), height * 0.14, true);
 text("CONTACT OWNER", Math.min(base * 0.071, height * 0.065), height * 0.214, true);
 text("QRmyCAR", Math.min(base * 0.03, height * 0.03) * settings.brandingScale / 100, height * 0.263);
 rounded(panel.x, panel.y, panel.width, panel.height, base * 0.055, color("accent"));
 const border = base * 0.016;
 rounded(panel.x + border, panel.y + border, panel.width - border * 2, panel.height - border * 2, base * 0.04, color("paper"));
 ctx.imageSmoothingEnabled = false; ctx.drawImage(qr, qrBox.x, qrBox.y, qrBox.size, qrBox.size);
 ctx.fillStyle = color("ink");
 text(new URL(ASSET_PUBLIC_ORIGIN).hostname, Math.min(base * 0.0275, height * 0.028), panel.y + panel.height - border - layout.websiteHeight * 0.3, false, panel.width - margin);
 ctx.fillStyle = color("accent");
 text(car.registration_number, Math.min(base * 0.02875, height * 0.026), height * 0.976, true);
 return canvas.toDataURL("image/png");
}

export async function buildCarLabelPdf(car: LabelCar, settings: CarLabelSettings = defaultCarLabelSettings) {
 const image = await carLabelImage(car, settings);
 const pdf = new jsPDF({ unit: "mm", format: [settings.width, settings.height], orientation: settings.width > settings.height ? "landscape" : "portrait", compress: true });
 pdf.addImage(image, "PNG", 0, 0, settings.width, settings.height);
 return pdf;
}
export async function downloadCarLabel(car: LabelCar, settings: CarLabelSettings = defaultCarLabelSettings) {
 (await buildCarLabelPdf(car, settings)).save(`QRmyCAR-${car.registration_number}.pdf`);
}

export async function printCarLabel(car: LabelCar, settings: CarLabelSettings = defaultCarLabelSettings) {
 const popup = window.open("", "_blank", "width=600,height=750");
 if (!popup) throw new Error("Allow pop-ups to print the label");
 try {
  const image = await carLabelImage(car, settings);
  popup.document.title = `QRmyCAR - ${car.registration_number}`;
  const style = popup.document.createElement("style");
  style.textContent = `@page { size: ${settings.width}mm ${settings.height}mm; margin: 0; } body { margin: 0; } img { display: block; width: ${settings.width}mm; height: ${settings.height}mm; }`;
  popup.document.head.append(style);
  const img = popup.document.createElement("img"); img.alt = "QRmyCAR sticker";
  img.onload = () => { popup.focus(); popup.print(); };
  img.src = image; popup.document.body.append(img);
 } catch (error) { popup.close(); throw error; }
}
