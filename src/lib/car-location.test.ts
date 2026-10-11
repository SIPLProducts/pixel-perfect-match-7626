import { test } from "node:test";
import assert from "node:assert/strict";
import { carMessageSchema } from "./car-schema";
import { carMessageWithLocation, carMessageMapUrl, carLocationUrl } from "./car-location";
test("vehicle emergencies are accepted as saved contact reasons", () => {
  assert.equal(carMessageSchema.parse({ token: "11111111-1111-4111-8111-111111111111", reason: "emergency" }).reason, "emergency");
});
test("shared coordinates travel with the parking message and resolve to the same map", () => {
  const message = carMessageWithLocation("Gate 2", { latitude: 17.385, longitude: 78.4867 });
  assert.equal(message, "Gate 2\nLocation: https://www.google.com/maps?q=17.385000,78.486700");
  assert.equal(carMessageMapUrl(message), "https://www.google.com/maps?q=17.385000,78.486700");
});
test("location is optional and invalid coordinates never become map links", () => {
  assert.equal(carMessageWithLocation(" Gate 2 ", null), "Gate 2");
  assert.throws(() => carLocationUrl({ latitude: 91, longitude: 0 }));
  assert.equal(carMessageMapUrl("Location: https://evil.example/maps?q=17,78"), null);
});