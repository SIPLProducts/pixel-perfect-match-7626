import { test } from "node:test";
import assert from "node:assert/strict";
import { importAssetsSchema, validateImportRows, importFields, createAssetTemplateWorkbook, readAssetWorkbook } from "./asset-import";
import { assetSchema, assetValues } from "./asset-form-schema";

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
test("Excel mapping covers every editable asset field and preserves ERP values", () => {
  assert.deepEqual(importFields.map(field => field.key).filter(key => key !== "parentCategory").sort(), Object.keys(assetSchema.shape).sort());
  const values: Record<string, string> = {
    name: "ERP equipment", categoryId: "Laptops", externalAssetNumber: "000100016", assetSubnumber: "0000",
    depreciationKey: "0000", plannedLife: "000/000", erpLocation: "0012", depreciationStartDate: "1989-06-30",
    costCenter: "FF10001612", quantity: "10.07", baseUnit: "ACR", currency: "INR", startingBookValue: "737222",
    specialDepreciation: "-12.5", accumulatedDepreciation: "100", writeUps: "5", transactionAcquisitionValue: "12",
    transferredAccumulatedDepreciation: "3", plannedDepreciation: "8", supplier: "Test supplier", wbsElement: "WBS-01",
    erpReference1: "001", erpReference2: "002", erpReference3: "003", erpReference4: "004",
  };
  const row = validateImportRows([importFields.map(field => field.label), importFields.map(field => values[field.key] ?? "")], masters)[0];
  assert.deepEqual(row?.errors, []);
  assert.ok(row?.data);
  if (!row?.data) return;
  const stored = assetValues(row.data);
  assert.equal(stored.external_asset_number, "000100016");
  assert.equal(stored.depreciation_key, "0000");
  assert.equal(stored.planned_life, "000/000");
  assert.equal(stored.erp_location, "0012");
  assert.equal(stored.depreciation_start_date, "1989-06-30");
  assert.equal(stored.quantity, 10.07);
  assert.equal(stored.special_depreciation, -12.5);
  for (const field of importFields.filter(field => values[field.key] && field.key !== "categoryId" && field.key !== "parentCategory")) {
    assert.equal(row.data[field.key as keyof typeof row.data], field.type === "number" ? Number(values[field.key]) : values[field.key]);
  }
});
test("expanded Excel template round trips with text codes and full-width filters", async () => {
  const workbook = await createAssetTemplateWorkbook(masters);
  const sheet = workbook.getWorksheet("Assets");
  assert.ok(sheet);
  if (!sheet) return;
  const codes: Record<string,string> = {name:"Template equipment",categoryId:"Laptops",depreciationKey:"0000",plannedLife:"000/000",erpLocation:"001"};
  sheet.addRow(importFields.map(field => codes[field.key] ?? ""));
  assert.deepEqual(sheet.autoFilter, {from:{row:1,column:1},to:{row:1,column:importFields.length}});
  const buffer = await workbook.xlsx.writeBuffer();
  const rows = await readAssetWorkbook(new File([new Uint8Array(buffer)], "assets.xlsx"));
  const validated = validateImportRows(rows, masters);
  assert.deepEqual(validated[0]?.errors, []);
  assert.equal(validated[0]?.data?.depreciationKey, "0000");
  assert.equal(validated[0]?.data?.erpLocation, "001");
});
test("Excel upload rejects duplicated old and new headings and invalid ERP values", () => {
  assert.throws(()=>validateImportRows([["Asset name","Asset description / name","Category"],["One","Two","Laptops"]],masters), /Duplicate/);
  const result = validateImportRows([["Asset description / name","Category","Quantity","Depreciation calculation start date"],["Equipment","Laptops","invalid","2026-99-99"]],masters);
  assert.equal(result[0]?.data,undefined);
  assert.equal(result[0]?.errors.length,2);
});
test("import rejects parent categories and checks the optional parent column", () => {
  const masters = { categories: [{ id: "00000000-0000-4000-8000-000000000001", name: "IT & Computer Equipment", parent_id: null }, { id: "00000000-0000-4000-8000-000000000002", name: "Laptops", parent_id: "00000000-0000-4000-8000-000000000001" }], locations: [], departments: [], employees: [], assets: [] };
  const run = (category: string, parent?: string) => validateImportRows([["Asset description / name", "Category", ...(parent === undefined ? [] : ["Parent category"])], ["Dell laptop", category, ...(parent === undefined ? [] : [parent])]], masters)[0]!;
  assert.equal(run("Laptops").errors.length, 0);
  assert.equal(run("Laptops", "IT & Computer Equipment").errors.length, 0);
  assert.match(run("IT & Computer Equipment").errors.join(), /parent category/);
  assert.match(run("Laptops", "Vehicles & Transport").errors.join(), /does not match/);
});
