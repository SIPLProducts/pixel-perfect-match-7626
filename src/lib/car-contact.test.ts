import { test } from "node:test";
import assert from "node:assert/strict";
import { carDirectContact } from "./car-contact";

test("direct calls use the owner's full international number", () => {
  assert.equal(carDirectContact("+12025550101", "DEMO-CAR-001", "wrong_parking")?.call, "tel:+12025550101");
});
test("WhatsApp targets the owner and includes parking reason and details", () => {
  const contact = carDirectContact("+12025550101", "DEMO-CAR-001", "reserved_slot", "Near Gate 2");
  assert.ok(contact);
  const url = new URL(contact.whatsapp);
  assert.equal(url.origin + url.pathname, "https://wa.me/12025550101");
  assert.equal(url.searchParams.get("text"), "Hello, regarding your car DEMO-CAR-001: Parked in someone else's slot. Near Gate 2");
});
test("invalid numbers cannot create direct contact links", () => {
  assert.equal(carDirectContact("javascript:alert(1)", "DEMO", "wrong_parking"), null);
});