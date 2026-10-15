import { test } from "node:test";
import assert from "node:assert/strict";
import { assignableCategories, canManageCategories, categoryConflict, categorySchema, categoryTree, parentBlocker } from "./category-schema";

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

const tree = [
  { id: "it", name: "IT & Computer Equipment", parent_id: null },
  { id: "lap", name: "Laptops", parent_id: "it" },
  { id: "oth", name: "Other Equipment", parent_id: null },
  { id: "chr", name: "Chairs", parent_id: null },
];
test("parent categories cannot be assigned to assets", () => {
  assert.deepEqual(assignableCategories(tree).map((r) => r.id), ["lap", "oth", "chr"]);
});
test("only two levels, no self-parent, no parent used by assets", () => {
  assert.equal(parentBlocker(tree, "lap", "lap", new Set()), "A category cannot be its own parent");
  assert.equal(parentBlocker(tree, "chr", "lap", new Set()), "Choose a top-level parent category");
  assert.equal(parentBlocker(tree, "it", "oth", new Set()), "A category with subcategories cannot become a subcategory");
  assert.equal(parentBlocker(tree, "chr", "oth", new Set(["oth"])), "That category is used by assets, so it cannot become a parent");
  assert.equal(parentBlocker(tree, "chr", "it", new Set()), null);
});
test("tree lists each parent followed by its subcategories", () => {
  assert.deepEqual(categoryTree(tree).map((n) => `${n.depth}:${n.row.id}`), ["0:chr", "0:it", "1:lap", "0:oth"]);
});
test("a parent and subcategory cannot share a name", () => {
  assert.equal(categoryConflict(tree, "laptops", "NEWP"), "name");
});
