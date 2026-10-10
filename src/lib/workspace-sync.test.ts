import { test } from "node:test";
import assert from "node:assert/strict";
import { workspaceSubscriptions } from "./workspace-sync";
import { readAllRows } from "./read-all-rows";

test("asset, service and reference updates subscribe only to the active organization", () => {
  const subscriptions = workspaceSubscriptions("org-a", "user-a");
  for (const table of ["assets", "asset_qr_codes", "asset_categories", "maintenance_requests", "asset_transfers", "asset_events", "locations", "employees", "integrations"]) {
    assert.equal(subscriptions.find(item => item.table === table)?.filter, "organization_id=eq.org-a");
  }
  assert.equal(subscriptions.find(item => item.table === "profiles")?.filter, "id=eq.user-a");
  assert.equal(subscriptions.find(item => item.table === "user_roles")?.filter, "user_id=eq.user-a");
});
test("all existing records are retained beyond the first page", async () => {
  const records = Array.from({ length: 1205 }, (_, id) => ({ id }));
  const result = await readAllRows(async (from, to) => ({ data: records.slice(from, to + 1), error: null }));
  assert.deepEqual(result.data, records);
});
test("a failed page never returns a misleading partial register", async () => {
  await assert.rejects(readAllRows(async () => ({ data: null, error: { message: "Unavailable" } })), /Unavailable/);
});