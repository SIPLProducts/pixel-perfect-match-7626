import { test } from "node:test";
import assert from "node:assert/strict";
import { carSchema, carValues, carMessageSchema } from "./car-schema";
import { carContactUrl } from "./car-labels";
const car = { registrationNumber: "ts 09 ab 1234", ownerName: "Test Owner", ownerMobile: "+919876543210", make: "Test", model: "Car" };
test("car edits cannot replace QR identity or tenant", () => {
 const parsed = carSchema.parse({ ...car, id: "replace", qr_token: "replace", organization_id: "replace" });
 const values = carValues(parsed);
 assert.equal(values.registration_number, "TS09AB1234");
 assert.equal(values.owner_mobile, "+919876543210");
 for (const key of ["id", "qr_token", "organization_id", "created_by"]) assert.equal(key in values, false);
});
test("QR content uses only canonical car token URL without owner phone", () => {
 const token = "11111111-1111-4111-8111-111111111111";
 assert.equal(carContactUrl(token), `https://qrmyassets.siplproducts.com/car/${token}`);
 assert.equal(carContactUrl(token).includes(car.ownerMobile), false);
});
test("parking messages include requested parking reasons and no caller-supplied identity", () => {
 for (const reason of ["wrong_parking", "blocked_access", "move_car", "reserved_slot", "other"]) {
 const message = carMessageSchema.parse({ token: "11111111-1111-4111-8111-111111111111", reason, message: "Please move your car", organization_id: "replace", car_id: "replace" });
 assert.equal(message.reason, reason); assert.equal("car_id" in message, false); assert.equal("organization_id" in message, false);
 }
 assert.equal(carMessageSchema.safeParse({ token: "11111111-1111-4111-8111-111111111111", reason: "unknown" }).success, false);
});
