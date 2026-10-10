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
});