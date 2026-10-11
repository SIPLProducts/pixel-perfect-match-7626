import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { ASSET_PUBLIC_ORIGIN } from "./asset-labels";
export function carContactUrl(token: string) { return new URL(`/car/${encodeURIComponent(token)}`, ASSET_PUBLIC_ORIGIN).href; }
export const carQr = (token: string) => QRCode.toDataURL(carContactUrl(token), { width: 800, margin: 4, errorCorrectionLevel: "M" });
export const carLabelSize = { width: 80, height: 96 } as const;
type LabelCar = { registration_number: string; qr_token: string };

export async function carLabelImage(car: LabelCar) {
 const qr = new Image();
 qr.src = await carQr(car.qr_token);
 await qr.decode();
 const canvas = document.createElement("canvas");
 canvas.width = 1600; canvas.height = 1920;
 const ctx = canvas.getContext("2d");
 if (!ctx) throw new Error("Could not prepare the label");
 ctx.scale(2, 2);
 const tokens = getComputedStyle(document.documentElement);
 const color = (name: string) => tokens.getPropertyValue(`--car-label-${name}`).trim();
 const rounded = (x: number, y: number, w: number, h: number, r: number, fill: string) => {
  ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
 };
 rounded(0, 0, 800, 960, 80, color("background"));
 ctx.textAlign = "center"; ctx.fillStyle = color("accent");
 ctx.font = "28px Arial, sans-serif"; ctx.fillText("Sharvi's QRmyAssets", 400, 53);
 ctx.font = "bold 68px Arial, sans-serif"; ctx.fillText("SCAN TO", 400, 134);
 ctx.font = "bold 57px Arial, sans-serif"; ctx.fillText("CONTACT OWNER", 400, 204);
 ctx.font = "24px Arial, sans-serif"; ctx.fillText("QRmyCAR", 400, 251);
 rounded(65, 280, 670, 620, 44, color("accent"));
 rounded(78, 293, 644, 594, 32, color("paper"));
 ctx.imageSmoothingEnabled = false; ctx.drawImage(qr, 131, 302, 538, 538);
 ctx.fillStyle = color("ink"); ctx.font = "22px Arial, sans-serif";
 ctx.fillText(new URL(ASSET_PUBLIC_ORIGIN).hostname, 400, 865);
 ctx.fillStyle = color("accent"); ctx.font = "bold 23px Arial, sans-serif";
 const registration = car.registration_number;
 while (ctx.measureText(registration).width > 640) {
  const size = Number.parseFloat(ctx.font.replace("bold ", ""));
  ctx.font = `bold ${size - 1}px Arial, sans-serif`;
 }
 ctx.fillText(registration, 400, 937);
 return canvas.toDataURL("image/png");
}

export async function buildCarLabelPdf(car: LabelCar) {
 const pdf = new jsPDF({ unit: "mm", format: [carLabelSize.width, carLabelSize.height], orientation: "portrait", compress: true });
 pdf.addImage(await carLabelImage(car), "PNG", 0, 0, carLabelSize.width, carLabelSize.height);
 return pdf;
}
export async function downloadCarLabel(car: LabelCar) {
 (await buildCarLabelPdf(car)).save(`QRmyCAR-${car.registration_number}.pdf`);
}

export async function printCarLabel(car: LabelCar) {
 const popup = window.open("", "_blank", "width=600,height=750");
 if (!popup) throw new Error("Allow pop-ups to print the label");
 try {
  const image = await carLabelImage(car);
  popup.document.title = `QRmyCAR - ${car.registration_number}`;
  const style = popup.document.createElement("style");
  style.textContent = `@page { size: ${carLabelSize.width}mm ${carLabelSize.height}mm; margin: 0; } body { margin: 0; } img { display: block; width: ${carLabelSize.width}mm; height: ${carLabelSize.height}mm; }`;
  popup.document.head.append(style);
  const img = popup.document.createElement("img"); img.alt = "QRmyCAR sticker";
  img.onload = () => { popup.focus(); popup.print(); };
  img.src = image; popup.document.body.append(img);
 } catch (error) { popup.close(); throw error; }
}
