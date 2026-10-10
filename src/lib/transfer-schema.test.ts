import { test } from "node:test";
import assert from "node:assert/strict";
import { canEditTransfer, editTransferSchema, transferActions, transferRoles, transferSchema } from "./transfer-schema";

const data = { assetId: "d794ae2d-c207-4a4a-8756-d0fb8197b386", toLocationId: "25df8231-a69c-4c04-88c9-d98dfe28f51b", transferDate: "2026-10-10", reason: "Office relocation" };
test("transfer form validates destinations, dates and reason", () => {
  assert.equal(transferSchema.safeParse(data).success, true);
  for (const invalid of [{toLocationId:""},{transferDate:"2026-99-99"},{reason:"ab"}]) assert.equal(transferSchema.safeParse({...data,...invalid}).success,false);
});
test("editing preserves asset identity and requires a concurrency timestamp", () => {
  const edited = editTransferSchema.parse({...data, transferId:data.assetId, expectedUpdatedAt:"2026-10-10T16:00:00Z"});
  assert.equal("assetId" in edited, false);
  assert.equal(editTransferSchema.safeParse({...data,transferId:data.assetId}).success,false);
});
test("only open transfers are editable and have processing actions", () => {
  assert.equal(canEditTransfer("pending"),true);assert.equal(canEditTransfer("approved"),true);
  assert.deepEqual(transferActions("pending"),["approve","complete","reject"]);
  assert.deepEqual(transferActions("approved"),["complete","reject"]);
  for (const status of ["completed","rejected","cancelled","draft"]) {assert.equal(canEditTransfer(status),false);assert.deepEqual(transferActions(status),[]);}
});
test("transfer management retains the existing manager roles", () => {
  assert.deepEqual(transferRoles,["super_admin","admin","asset_manager","facility_manager","it_manager"]);
});