import { test } from "node:test";
import assert from "node:assert/strict";
import { mapSapValues, sapAssetSource } from "./sap-asset-source";

test("SAP source stays unconfigured and returns no invented asset codes or values", async () => {
  assert.equal(sapAssetSource.configured, false);
  assert.deepEqual(await sapAssetSource.searchCodes("LAP"), []);
  assert.deepEqual(await sapAssetSource.getDetails("100000023"), {});
});

test("SAP values fill only mapped form fields that SAP returned", () => {
  const result = mapSapValues({ name: "Laptop", serialNumber: "SN1", unknownSapField: "x", plant: "", model: null }, ["name", "serialNumber", "plant", "model"]);
  assert.deepEqual(result, { name: "Laptop", serialNumber: "SN1" });
});
