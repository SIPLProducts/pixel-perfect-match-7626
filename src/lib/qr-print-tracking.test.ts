import { test } from "node:test";
import assert from "node:assert/strict";
import { deliverTrackedLabels, qrPrintCounts, qrPrintSchema } from "./qr-print-tracking";

test("QR print counts include each output once per asset and new assets start at zero", () => {
  const counts = qrPrintCounts([{ asset_id: "a" }, { asset_id: "a" }, { asset_id: "b" }]);
  assert.equal(counts.get("a"), 2);
  assert.equal(counts.get("b"), 1);
  assert.equal(counts.get("new") ?? 0, 0);
});
test("failed label delivery does not increase QR print count", async () => {
  let count = 0;
  await assert.rejects(deliverTrackedLabels(() => { throw new Error("Failed output"); }, async () => { count++; }));
  assert.equal(count, 0);
});
test("tracking retries do not produce a second printed label", async () => {
  let deliveries = 0, attempts = 0;
  await deliverTrackedLabels(() => { deliveries++; }, async () => { attempts++; if (attempts === 1) throw new Error("Network"); });
  assert.equal(deliveries, 1);
  assert.equal(attempts, 2);
});
test("only print, PDF and PNG outputs may be counted", () => {
  const input = { operationId: "692e56a2-cdd7-48ac-96e4-92d910ac4e43", assetIds: ["29390866-5381-4437-a8e9-e98099415858"] };
  for (const action of ["print", "pdf", "png"]) assert.equal(qrPrintSchema.safeParse({ ...input, action }).success, true);
  assert.equal(qrPrintSchema.safeParse({ ...input, action: "preview" }).success, false);
  assert.equal(qrPrintSchema.safeParse({ ...input, action: "print", assetIds: [...input.assetIds, ...input.assetIds] }).success, false);
});