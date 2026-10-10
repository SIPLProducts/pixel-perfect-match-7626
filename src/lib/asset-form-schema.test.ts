import { describe, expect, test } from "bun:test";
import { assetSchema, assetValues, updateAssetSchema } from "./asset-form-schema";

const values = { name: "Office laptop", categoryId: "d794ae2d-c207-4a4a-8756-d0fb8197b386", status: "active", condition: "good" };

describe("Asset form validation", () => {
  test("editing keeps asset IDs and QR identities outside the writable fields", () => {
    const parsed = updateAssetSchema.parse({ ...values, assetId: "ad56c4f2-2f75-4724-9b3a-bb8e508b3aae", asset_id: "LAP-000001", token: "new-token" });
    const writable = assetValues(parsed);
    expect(writable).not.toHaveProperty("asset_id");
    expect(writable).not.toHaveProperty("token");
    expect(writable).not.toHaveProperty("id");
    expect(writable.name).toBe("Office laptop");
  });
  test("rejects malformed category IDs", () => {
    expect(assetSchema.safeParse({ ...values, categoryId: "invalid" }).success).toBe(false);
  });
  test("rejects negative acquisition values", () => {
    expect(assetSchema.safeParse({ ...values, purchaseValue: -1 }).success).toBe(false);
  });
  test("clearing optional values removes the stored value", () => {
    expect(assetValues(assetSchema.parse({ ...values, serialNumber: "" })).serial_number).toBeNull();
  });
});