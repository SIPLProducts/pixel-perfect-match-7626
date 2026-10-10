import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { ASSET_PUBLIC_ORIGIN } from "./asset-labels";
export function carContactUrl(token: string) { return new URL(`/car/${encodeURIComponent(token)}`, ASSET_PUBLIC_ORIGIN).href; }
export const carQr = (token: string) => QRCode.toDataURL(carContactUrl(token), { width: 800, margin: 4, errorCorrectionLevel: "M" });
export async function downloadCarLabel(car: { registration_number: string; qr_token: string }) {
 const pdf = new jsPDF({ unit: "mm", format: [100, 70], orientation: "landscape" });
 pdf.setFont("helvetica", "bold"); pdf.setFontSize(16); pdf.text("QRmyCAR", 8, 12); pdf.setFontSize(10); pdf.text(car.registration_number, 8, 21);
 pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.text(["Parking concern?", "Scan to leave", "a message."], 8, 35);
 pdf.addImage(await carQr(car.qr_token), "PNG", 49, 12, 46, 46); pdf.setFontSize(7); pdf.text("Owner's number stays private", 8, 63); pdf.save(`QRmyCAR-${car.registration_number}.pdf`);
}
