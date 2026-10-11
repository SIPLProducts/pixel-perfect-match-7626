import { test, expect } from "bun:test";
import { carPublicProfile } from "./car-public-profile";

test("public car data never includes either party's number or contact links", () => {
  const record = { registration_number: "CAR-001", owner_name: "Owner", make: "Tata", model: "Harrier", color: "White", owner_mobile: "+919876543210", mobile_masked: "••••••3210", visitor_mobile: "+919876543211" };
  expect(carPublicProfile(record)).toEqual({ registration_number: "CAR-001", owner_name: "Owner", make: "Tata", model: "Harrier", color: "White" });
});