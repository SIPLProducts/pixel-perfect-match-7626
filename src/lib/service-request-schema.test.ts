import { test } from "node:test";
import assert from "node:assert/strict";
import { serviceRequestSchema, serviceRequestValues, serviceStatuses } from "./service-request-schema";

const input = {
  requestId: "29390866-5381-4437-a8e9-e98099415858", expectedUpdatedAt: "2026-10-10T15:59:00+00:00",
  title: "Equipment breakdown", status: "pending", remarks: "Reported by the user", serviceProvider: "",
  technician: "", partsUsed: "", cost: 0, startDate: "", completionDate: "", nextMaintenanceDate: "",
};
test("service requests can be updated to each existing workflow status", () => {
  for (const status of serviceStatuses) assert.equal(serviceRequestValues(serviceRequestSchema.parse({ ...input, status })).status, status);
  assert.equal(serviceRequestSchema.safeParse({ ...input, status: "unknown" }).success, false);
});
test("editing a request cannot replace its asset, reporter, source, photo or identity", () => {
  const values = serviceRequestValues(serviceRequestSchema.parse({ ...input, title: "Updated breakdown", asset_id: "other", photo_path: "other", source: "portal", created_by: "other" }));
  assert.equal(values.title, "Updated breakdown");
  for (const key of ["id", "requestId", "asset_id", "organization_id", "photo_path", "created_by", "source"]) assert.equal(Object.hasOwn(values, key), false);
});
test("service updates require a version and reject negative costs and reversed service dates", () => {
  assert.equal(serviceRequestSchema.safeParse({ ...input, expectedUpdatedAt: "" }).success, false);
  assert.equal(serviceRequestSchema.safeParse({ ...input, cost: -1 }).success, false);
  assert.equal(serviceRequestSchema.safeParse({ ...input, startDate: "2026-10-10", completionDate: "2026-10-09" }).success, false);
});