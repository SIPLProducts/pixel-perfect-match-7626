import { z } from "zod";
export const carSchema = z.object({
 registrationNumber: z.string().trim().min(2).max(30).transform(v => v.toUpperCase().replace(/\s+/g, "")),
 ownerName: z.string().trim().min(2).max(100), ownerMobile: z.string().trim().regex(/^\+[1-9]\d{7,14}$/, "Enter a mobile number with country code, e.g. +919876543210"),
 make: z.string().trim().min(1).max(80), model: z.string().trim().min(1).max(80), color: z.string().trim().max(50).default(""),
 manufactureYear: z.preprocess(v => v === "" || v === null ? undefined : v, z.coerce.number().int().min(1900).max(2100).optional()),
 parkingSlot: z.string().trim().max(80).default(""), remarks: z.string().trim().max(1000).default(""), active: z.boolean().default(true),
});
export const parkingReasons = { wrong_parking: "Wrong parking", blocked_access: "Blocking access", move_car: "Please move your car", reserved_slot: "Parked in someone else's slot", other: "Other concern" } as const;
export const carMessageSchema = z.object({ token: z.string().uuid(), reason: z.enum(["wrong_parking", "blocked_access", "move_car", "reserved_slot", "other"]), message: z.string().trim().max(1000).default("") });
export function carValues(d: z.infer<typeof carSchema>) { return { registration_number: d.registrationNumber, owner_name: d.ownerName, owner_mobile: d.ownerMobile, make: d.make, model: d.model, color: d.color, manufacture_year: d.manufactureYear ?? null, parking_slot: d.parkingSlot, remarks: d.remarks, active: d.active }; }
