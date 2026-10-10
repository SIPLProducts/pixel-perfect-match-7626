import { test } from "node:test";
import assert from "node:assert/strict";
import { importAssetsSchema, validateImportRows } from "./asset-import";

const masters = { categories: [{ id: "d794ae2d-c207-4a4a-8756-d0fb8197b386", name: "Laptops" }], locations: [], departments: [], employees: [], assets: [{ serial_number: "EXISTING" }] };
test("Excel upload maps existing category names and defaults", () => {
  const rows = validateImportRows([["Asset name", "Category"], ["Office laptop", "laptops"]], masters);
  assert.equal(rows[0]?.data?.categoryId, masters.categories[0]?.id);
  assert.equal(rows[0]?.data?.status, "active");
});
test("Excel upload rejects existing serial numbers", () => {
  const rows = validateImportRows([["Asset name", "Category", "Serial number"], ["Office laptop", "Laptops", "existing"]], masters);
  assert.equal(rows[0]?.data, undefined);
  assert.ok(rows[0]?.errors.some(error => error.includes("Serial number")));
});
test("Excel upload rejects unknown workspace locations", () => {
  const rows = validateImportRows([["Asset name", "Category", "Location"], ["Office laptop", "Laptops", "Unknown"]], masters);
  assert.equal(rows[0]?.data, undefined);
});
test("Excel upload requires name and category headings", () => {
  assert.throws(() => validateImportRows([["Other"], ["value"]], masters));
});
test("bulk import server validation rejects oversized batches", () => {
  const row = { name: "Laptop", categoryId: masters.categories[0]?.id, status: "active", condition: "good" };
  assert.equal(importAssetsSchema.safeParse({ rows: Array.from({ length: 501 }, () => row) }).success, false);
});