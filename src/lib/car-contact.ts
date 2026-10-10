import { parkingReasons } from "./car-schema";

export function carDirectContact(mobile: string, registration: string, reason: keyof typeof parkingReasons, details = "") {
  if (!/^\+[1-9]\d{7,14}$/.test(mobile)) return null;
  const message = `Hello, regarding your car ${registration}: ${parkingReasons[reason]}.${details.trim() ? ` ${details.trim()}` : ""}`;
  return {
    call: `tel:${mobile}`,
    whatsapp: `https://wa.me/${mobile.slice(1)}?text=${encodeURIComponent(message)}`,
  };
}