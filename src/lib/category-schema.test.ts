import { test } from "node:test";
import assert from "node:assert/strict";
import { canManageCategories, categoryConflict, categorySchema } from "./category-schema";

test("name and prefix are required", () => {
  assert.equal(categorySchema.safeParse({ name: "", prefix: "LAP" }).success, false);
  assert.equal(categorySchema.safeParse({ name: "Laptops", prefix: "" }).success, false);
});
test("prefix is uppercased and must be 2-6 letters or digits", () => {
  assert.equal(categorySchema.parse({ name: "Laptops", prefix: " lap1 " }).prefix, "LAP1");
  for (const prefix of ["L", "LAPTOPS", "LA-P"]) assert.equal(categorySchema.safeParse({ name: "Laptops", prefix }).success, false);
});
test("duplicate names (any case) and prefixes are detected, ignoring the edited row", () => {
  const rows = [{ id: "1", name: "Laptops", prefix: "LAP" }];
  assert.equal(categoryConflict(rows, "laptops", "NEW"), "name");
  assert.equal(categoryConflict(rows, "Other", "lap"), "prefix");
  assert.equal(categoryConflict(rows, "Laptops", "LAP", "1"), null);
});
test("only super_admin, admin and asset_manager manage categories", () => {
  for (const role of ["super_admin", "admin", "asset_manager"]) assert.equal(canManageCategories(role), true);
  for (const role of ["viewer", "employee", "finance", "auditor", null]) assert.equal(canManageCategories(role), false);
});
