import { test as it } from "node:test";
import assert from "node:assert/strict";
import { categoryMatches, countBy, inDateRange, openServiceRequestCount, warrantyWithin } from "./report-builders";
import { reportHeaderRows } from "./report-export";


  it("counts only service requests that are not closed or completed", () => {
    assert.equal(openServiceRequestCount([{ status: "pending" }, { status: "approved" }, { status: "draft" }, { status: "completed" }, { status: "cancelled" }, { status: "closed" }, { status: "rejected" }]), 3);
  });
  it("parent category matches its subcategory assets", () => {
    const a = { asset_categories: { name: "Laptops" }, parent_category_name: "IT" };
    assert.equal(categoryMatches(a, "IT"), true);
    assert.equal(categoryMatches(a, "Laptops"), true);
    assert.equal(categoryMatches(a, "Furniture"), false);
  });
  it("top-N category counts sorted by size", () => {
    const rows = ["A", "B", "B", "C", "C", "C"].map((n) => ({ n }));
    assert.deepEqual(countBy(rows, (r) => r.n, 2), [{ name: "C", value: 3 }, { name: "B", value: 2 }]);
  });
  it("warranty window is inclusive of today and day N, excludes past and beyond", () => {
    const now = new Date("2026-11-02T10:00:00");
    assert.equal(warrantyWithin("2026-11-02", 30, now), true);
    assert.equal(warrantyWithin("2026-12-02", 30, now), true);
    assert.equal(warrantyWithin("2026-12-03", 30, now), false);
    assert.equal(warrantyWithin("2026-11-01", 30, now), false);
    assert.equal(warrantyWithin("2027-01-31", 90, now), true);
  });
  it("date range filter", () => {
    assert.equal(inDateRange("2026-05-10T00:00:00Z", "2026-05-01", "2026-05-31"), true);
    assert.equal(inDateRange("2026-06-01T00:00:00Z", "2026-05-01", "2026-05-31"), false);
  });
  it("excel header lists applied filters", () => {
    assert.deepEqual(reportHeaderRows({ organization: "HBL", generatedAt: "now", filters: ["Category: IT", "Location: Plant 1"] }, "Transfers")[3], ["Applied filters", "Category: IT | Location: Plant 1"]);
  });


import { monthlyCounts, plantSummary, qrInsights, warrantyBands } from "./report-builders";

it("buckets assets added per month over the last 12 months only", () => {
  const now = new Date(2026, 10, 4);
  const m = monthlyCounts(["2026-11-01T10:00:00Z", "2026-11-03", "2026-01-15", "2025-11-30"], 12, now);
  assert.equal(m.length, 12);
  assert.equal(m[11].value, 2);
  assert.equal(m[1].value, 1); // Jan 2026 (window starts Dec 2025)
  assert.equal(m.reduce((n, b) => n + b.value, 0), 3); // Nov 2025 is outside the window
});

it("groups warranty end dates into expiry bands", () => {
  const now = new Date(2026, 10, 4);
  const b = Object.fromEntries(warrantyBands(["2026-11-03", "2026-11-04", "2026-12-04", "2026-12-05", "2027-02-02", "2027-03-01", null], now).map((x) => [x.name, x.value]));
  assert.deepEqual(b, { "Expired": 1, "0–30 days": 2, "31–60 days": 1, "61–90 days": 1, "Over 90 days": 1, "Not recorded": 1 });
});

it("keeps active QR codes separate from printed labels and never counts scans", () => {
  const q = qrInsights([
    { qr_print_count: 2, asset_qr_codes: [{ active: true }] },
    { qr_print_count: 0, asset_qr_codes: [{ active: true }] },
    { qr_print_count: 0, asset_qr_codes: [] },
  ], [{ source: "qr" }, { source: "manual" }]);
  assert.deepEqual(q, { activeQrCodes: 2, labelsPrinted: 2, neverPrinted: 2, qrBreakdownReports: 1 });
});

it("summarises plants with open requests excluding completed ones", () => {
  const rows = plantSummary(
    [{ asset_id: "A1", plant: "P1", status: "active" }, { asset_id: "A2", plant: "P1", status: "missing" }, { asset_id: "A3", plant: "", status: "under_maintenance" }],
    [{ status: "pending", assets: { asset_id: "A1" } }, { status: "completed", assets: { asset_id: "A2" } }],
  );
  assert.deepEqual(rows[0], { plant: "P1", total: 2, active: 1, maintenance: 0, missing: 1, openRequests: 1 });
  assert.deepEqual(rows[1], { plant: "Unassigned", total: 1, active: 0, maintenance: 1, missing: 0, openRequests: 0 });
});
