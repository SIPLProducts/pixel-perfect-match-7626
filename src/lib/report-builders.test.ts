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

