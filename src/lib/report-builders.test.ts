import { describe, expect, it } from "vitest";
import { categoryMatches, countBy, inDateRange, openServiceRequestCount, warrantyWithin } from "./report-builders";
import { reportHeaderRows } from "./report-export";

describe("report builders", () => {
  it("counts only service requests that are not closed or completed", () => {
    expect(openServiceRequestCount([{ status: "pending" }, { status: "approved" }, { status: "draft" }, { status: "completed" }, { status: "cancelled" }, { status: "closed" }, { status: "rejected" }])).toBe(3);
  });
  it("parent category matches its subcategory assets", () => {
    const a = { asset_categories: { name: "Laptops" }, parent_category_name: "IT" };
    expect(categoryMatches(a, "IT")).toBe(true);
    expect(categoryMatches(a, "Laptops")).toBe(true);
    expect(categoryMatches(a, "Furniture")).toBe(false);
  });
  it("top-N category counts sorted by size", () => {
    const rows = ["A", "B", "B", "C", "C", "C"].map((n) => ({ n }));
    expect(countBy(rows, (r) => r.n, 2)).toEqual([{ name: "C", value: 3 }, { name: "B", value: 2 }]);
  });
  it("warranty window is inclusive of today and day N, excludes past and beyond", () => {
    const now = new Date("2026-11-02T10:00:00");
    expect(warrantyWithin("2026-11-02", 30, now)).toBe(true);
    expect(warrantyWithin("2026-12-02", 30, now)).toBe(true);
    expect(warrantyWithin("2026-12-03", 30, now)).toBe(false);
    expect(warrantyWithin("2026-11-01", 30, now)).toBe(false);
    expect(warrantyWithin("2027-01-31", 90, now)).toBe(true);
  });
  it("date range filter", () => {
    expect(inDateRange("2026-05-10T00:00:00Z", "2026-05-01", "2026-05-31")).toBe(true);
    expect(inDateRange("2026-06-01T00:00:00Z", "2026-05-01", "2026-05-31")).toBe(false);
  });
  it("excel header lists applied filters", () => {
    expect(reportHeaderRows({ organization: "HBL", generatedAt: "now", filters: ["Category: IT", "Location: Plant 1"] }, "Transfers")[3]).toEqual(["Applied filters", "Category: IT | Location: Plant 1"]);
  });
});
