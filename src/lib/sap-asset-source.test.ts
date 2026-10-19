import { test } from "node:test";
import assert from "node:assert/strict";
import { sapAssetSource } from "./sap-asset-source";

test("SAP source stays unconfigured and returns no invented asset codes until the API is connected", async () => {
  assert.equal(sapAssetSource.configured, false);
  assert.deepEqual(await sapAssetSource.searchCodes("LAP"), []);
  assert.deepEqual(await sapAssetSource.getDetails("100000023"), []);
});
