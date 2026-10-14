import { test } from "node:test";
import assert from "node:assert/strict";
import { canManageLocations, deactivationBlocker, locationConflict, locationSchema, selectableLocations, wouldCreateCycle } from "./location-schema";

const rows = [
  { id: "a", code: "HYD", parent_id: null, status: "active" },
  { id: "b", code: "HYD-A", parent_id: "a", status: "active" },
  { id: "c", code: "HYD-A-1", parent_id: "b", status: "inactive" },
];

test("code is required, uppercased, 2-20 letters/digits/dashes", () => {
  assert.equal(locationSchema.parse({ code: " hyd-b ", name: "Block B", type: "building" }).code, "HYD-B");
  assert.equal(locationSchema.safeParse({ code: "H", name: "Block", type: "building" }).success, false);
  assert.equal(locationSchema.safeParse({ code: "HY D", name: "Block", type: "building" }).success, false);
  assert.equal(locationSchema.safeParse({ code: "HYD", name: "", type: "building" }).success, false);
  assert.equal(locationSchema.safeParse({ code: "HYD", name: "Block", type: "galaxy" }).success, false);
});

test("duplicate codes are detected case-insensitively, ignoring the edited row", () => {
  assert.equal(locationConflict(rows, "hyd-a"), true);
  assert.equal(locationConflict(rows, "HYD-A", "b"), false);
});

test("circular parents are rejected", () => {
  assert.equal(wouldCreateCycle(rows, "a", "a"), true);
  assert.equal(wouldCreateCycle(rows, "a", "c"), true);
  assert.equal(wouldCreateCycle(rows, "c", "a"), false);
});

test("deactivation is blocked by active children or open transfers", () => {
  assert.match(deactivationBlocker("a", rows, []) ?? "", /child/);
  assert.equal(deactivationBlocker("b", rows, []), null);
  assert.match(deactivationBlocker("b", rows, ["b"]) ?? "", /transfers/);
});

test("inactive locations hidden from new choices but kept when already selected", () => {
  assert.deepEqual(selectableLocations(rows).map((r) => r.id), ["a", "b"]);
  assert.deepEqual(selectableLocations(rows, "c").map((r) => r.id), ["a", "b", "c"]);
});

test("only manager roles may change locations", () => {
  assert.equal(canManageLocations("facility_manager"), true);
  assert.equal(canManageLocations("viewer"), false);
});
