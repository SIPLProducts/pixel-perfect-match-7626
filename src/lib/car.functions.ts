import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { carSchema, carValues, carMessageSchema } from "./car-schema";
export const saveCar = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
 .inputValidator(input => z.object({ car: carSchema, id: z.string().uuid().optional(), expectedUpdatedAt: z.string().datetime({ offset: true }).optional() }).parse(input))
 .handler(async ({ data, context }) => {
 const { data: member, error: membershipError } = await context.supabase.from("user_roles").select("organization_id").eq("user_id", context.userId).limit(1).maybeSingle();
 if (membershipError || !member) throw new Error("Workspace access required");
 if (data.id) {
 if (!data.expectedUpdatedAt) throw new Error("Reopen the car before saving");
 const { data: car, error } = await context.supabase.from("cars").update(carValues(data.car)).eq("id", data.id).eq("organization_id", member.organization_id).eq("updated_at", data.expectedUpdatedAt).select("id").maybeSingle();
 if (error) throw new Error(error.code === "23505" ? "This registration number is already registered" : "Could not update the car");
 if (!car) throw new Error("This car has changed. Reopen it before saving."); return car;
 }
 const { data: car, error } = await context.supabase.from("cars").insert({ ...carValues(data.car), organization_id: member.organization_id, created_by: context.userId }).select("id").single();
 if (error) throw new Error(error.code === "23505" ? "This registration number is already registered" : "Could not save the car"); return car;
 });
function publicClient() {
 const url = process.env["SUPABASE_URL"], key = process.env["SUPABASE_PUBLISHABLE_KEY"];
 if (!url || !key) throw new Error("Car contact is unavailable");
 return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => {
 const headers = new Headers(init?.headers); if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization"); headers.set("apikey", key); return fetch(input, { ...init, headers });
 } } });
}
export const getPublicCar = createServerFn({ method: "GET" }).inputValidator(input => z.object({ token: z.string().uuid() }).parse(input)).handler(async ({ data }) => {
 const { data: car, error } = await publicClient().rpc("get_public_car", { _token: data.token }).maybeSingle(); if (error) throw new Error("Car contact is unavailable"); return car;
});
export const submitCarMessage = createServerFn({ method: "POST" }).inputValidator(input => carMessageSchema.parse(input)).handler(async ({ data }) => {
 const { data: id, error } = await publicClient().rpc("submit_car_message", { _token: data.token, _reason: data.reason, _message: data.message }); if (error) throw new Error("Message could not be submitted. The label may be inactive."); return { id };
});
export const acknowledgeCarMessage = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(input => z.object({ id: z.string().uuid() }).parse(input)).handler(async ({ data, context }) => {
 const { data: message, error } = await context.supabase.from("car_messages").update({ status: "acknowledged" }).eq("id", data.id).select("id").maybeSingle(); if (error || !message) throw new Error("Message unavailable in your workspace"); return message;
});
