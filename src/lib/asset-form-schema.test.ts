import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { assetSchema, assetValues, updateAssetSchema } from "./asset-form-schema";

const values = { name: "Office laptop", categoryId: "d794ae2d-c207-4a4a-8756-d0fb8197b386", status: "active", condition: "good" };

describe("Asset form validation", () => {
  test("editing keeps asset IDs and QR identities outside the writable fields", () => {
    const parsed = updateAssetSchema.parse({ ...values, assetId: "ad56c4f2-2f75-4724-9b3a-bb8e508b3aae", asset_id: "LAP-000001", token: "new-token" });
    const writable = assetValues(parsed);
    assert.equal("asset_id" in writable, false);
    assert.equal("token" in writable, false);
    assert.equal("id" in writable, false);
    assert.equal(writable.name, "Office laptop");
  });
  test("rejects malformed category IDs", () => {
    assert.equal(assetSchema.safeParse({ ...values, categoryId: "invalid" }).success, false);
  });
  test("rejects negative acquisition values", () => {
    assert.equal(assetSchema.safeParse({ ...values, purchaseValue: -1 }).success, false);
  });
  test("clearing optional values removes the stored value", () => {
    assert.equal(assetValues(assetSchema.parse({ ...values, serialNumber: "" })).serial_number, null);
  });
  test("preserves ERP asset and sub-number independently from QR identity", () => {
    const stored = assetValues(assetSchema.parse({ ...values, externalAssetNumber: "100000023", assetSubnumber: "2" }));
    assert.equal(stored.external_asset_number, "100000023");
    assert.equal(stored.asset_subnumber, "2");
    assert.equal("asset_id" in stored, false);
  });
  test("preserves leading zeroes and original ERP life notation", () => {
    const stored = assetValues(assetSchema.parse({ ...values, depreciationKey: "0000", plannedLife: "000/000", erpLocation: "1000" }));
    assert.equal(stored.depreciation_key, "0000");
    assert.equal(stored.planned_life, "000/000");
    assert.equal(stored.erp_location, "1000");
  });
  test("stores the uploaded financial, quantity and date values without conflating fields", () => {
    const stored = assetValues(assetSchema.parse({ ...values, purchaseValue: 737222, currentValue: 737222, startingBookValue: 737222, quantity: 10.07, accumulatedDepreciation: 0, depreciationStartDate: "1989-06-30", installationDate: "1989-06-30", costCenter: "FF10001612", baseUnit: "ACR", currency: "INR", specialDepreciation: 0, writeUps: 0, transactionAcquisitionValue: 0, transferredAccumulatedDepreciation: 0, plannedDepreciation: 0, supplier: "50576", wbsElement: "PROJECT-01", erpReference1: "A", erpReference2: "B", erpReference3: "C", erpReference4: "D" }));
    assert.equal(stored.purchase_value, 737222);
    assert.equal(stored.current_value, 737222);
    assert.equal(stored.starting_book_value, 737222);
    assert.equal(stored.quantity, 10.07);
    assert.equal(stored.depreciation_start_date, "1989-06-30");
    assert.equal(stored.capitalization_date, "1989-06-30");
    assert.equal(stored.cost_center, "FF10001612");
    assert.equal(stored.base_unit, "ACR");
    assert.equal(stored.currency, "INR");
    assert.equal(stored.supplier, "50576");
    assert.equal(stored.wbs_element, "PROJECT-01");
    for (const key of ["accumulated_depreciation", "special_depreciation", "write_ups", "transaction_acquisition_value", "transferred_accumulated_depreciation", "planned_depreciation"] as const) assert.equal(stored[key], 0);
    assert.equal(stored.erp_reference_1, "A");
    assert.equal(stored.erp_reference_2, "B");
    assert.equal(stored.erp_reference_3, "C");
    assert.equal(stored.erp_reference_4, "D");
  });
});