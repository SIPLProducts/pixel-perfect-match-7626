import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isSapSyncRunStale, nextSapSyncBoundary, SAP_AUTO_SYNC_INTERVAL_MS, sapSyncDelay, selectAssetQrEndpoint } from "./sap-sync-schedule";

describe("SAP automatic sync schedule", () => {
  it("runs every six hours on UTC boundaries", () => {
    assert.equal(SAP_AUTO_SYNC_INTERVAL_MS, 21_600_000);
    assert.equal(nextSapSyncBoundary(new Date("2026-11-18T05:59:59Z")).toISOString(), "2026-11-18T06:00:00.000Z");
    assert.equal(nextSapSyncBoundary(new Date("2026-11-18T06:00:00Z")).toISOString(), "2026-11-18T12:00:00.000Z");
    assert.equal(nextSapSyncBoundary(new Date("2026-11-18T23:00:00Z")).toISOString(), "2026-11-19T00:00:00.000Z");
  });

  it("returns a positive delay to the next boundary", () => {
    assert.equal(sapSyncDelay(new Date("2026-11-18T05:59:59Z")), 1000);
    assert.equal(sapSyncDelay(new Date("2026-11-18T06:00:00Z")), SAP_AUTO_SYNC_INTERVAL_MS);
  });

  it("marks only runs older than two hours as interrupted", () => {
    assert.equal(isSapSyncRunStale("2026-11-18T10:00:00Z", new Date("2026-11-18T11:59:59Z")), false);
    assert.equal(isSapSyncRunStale("2026-11-18T09:59:59Z", new Date("2026-11-18T12:00:00Z")), true);
  });

  it("selects the configured Asset QR API before other active endpoints", () => {
    const endpoints = [
      { id: "other", name: "Material API", path: "/material" },
      { id: "report", name: "Asset QR Report", path: "/asset/qr/report?sap-client=234" },
      { id: "named", name: "Asset QR API", path: "/different" },
    ];
    assert.equal(selectAssetQrEndpoint(endpoints)?.id, "named");
    assert.equal(selectAssetQrEndpoint(endpoints.slice(0, 2))?.id, "report");
    assert.equal(selectAssetQrEndpoint([endpoints[0]!])?.id, "other");
  });
});
