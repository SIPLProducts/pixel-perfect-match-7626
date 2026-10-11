export type CarLabelSettings = {
 width: number;
 height: number;
 qrScale: number;
 brandingScale: number;
};

export const defaultCarLabelSettings: CarLabelSettings = { width: 80, height: 96, qrScale: 100, brandingScale: 100 };
export const carLabelPresets = {
 compact: { name: "Compact · 60 × 72 mm", width: 60, height: 72 },
 standard: { name: "Standard · 80 × 96 mm", width: 80, height: 96 },
 large: { name: "Large · 100 × 120 mm", width: 100, height: 120 },
 square: { name: "Square · 80 × 80 mm", width: 80, height: 80 },
 landscape: { name: "Landscape · 100 × 70 mm", width: 100, height: 70 },
} as const;

export function validateCarLabelSettings(settings: CarLabelSettings) {
 for (const key of ["width", "height"] as const) {
  if (!Number.isFinite(settings[key]) || settings[key] < 40 || settings[key] > 200) throw new Error("Sticker width and height must be between 40 and 200 mm");
 }
 if (!Number.isFinite(settings.qrScale) || settings.qrScale < 60 || settings.qrScale > 100) throw new Error("QR size must be between 60% and 100%");
 if (!Number.isFinite(settings.brandingScale) || settings.brandingScale < 70 || settings.brandingScale > 140) throw new Error("Branding size must be between 70% and 140%");
 return settings;
}

export function carLabelLayout(settings: CarLabelSettings) {
 const { width, height, qrScale } = validateCarLabelSettings(settings);
 const margin = Math.min(width, height) * 0.08;
 const panel = { x: margin, y: height * 0.292, width: width - margin * 2, height: height * 0.646 };
 const websiteHeight = Math.min(width, height) * 0.055;
 const qrAreaHeight = panel.height - websiteHeight - margin * 0.6;
 const maxQr = Math.min(panel.width - margin * 1.2, qrAreaHeight);
 const qrSize = maxQr * qrScale / 100;
 return {
  width, height, margin, panel, websiteHeight,
  qr: { x: (width - qrSize) / 2, y: panel.y + margin * 0.3 + (qrAreaHeight - qrSize) / 2, size: qrSize },
 };
}