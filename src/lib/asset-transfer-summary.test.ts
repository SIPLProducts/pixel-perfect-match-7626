import { test } from "node:test";
import assert from "node:assert/strict";
import { latestAssetTransfers } from "./asset-transfer-summary";

test("asset register transfer details use the latest request for each asset", () => {
  const older = { id: "1", asset_id: "asset-a", created_at: "2026-10-09T16:00:00Z", status: "completed" };
  const latest = { id: "2", asset_id: "asset-a", created_at: "2026-10-10T16:45:00Z", status: "pending" };
  const other = { id: "3", asset_id: "asset-b", created_at: "2026-10-10T15:00:00Z", status: "rejected" };
  const result = latestAssetTransfers([latest, other, older]);
  assert.deepEqual(result.get("asset-a"), latest);
  assert.deepEqual(result.get("asset-b"), other);
  assert.equal(result.get("asset-c"), undefined);
});