import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canManageSap, changedFields, flattenJson, mergeFieldNames, parseHeaders, resolveSapUrl, sapDataResponse } from "./sap-api";

describe("sap api helpers", () => {
  it("delivers a large SAP report as uncached JSON without a serialization envelope", async () => {
    const rows = Array.from({ length: 24896 }, (_, i) => ({ ANLN1: String(i), WERKS: "1000", TXT50: `Asset ${i}` }));
    const response = sapDataResponse({ ok: true, status: 200, latency: 47000, message: "200 OK", rows });
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(response.headers.get("Content-Type")?.split(";")[0], "application/json");
    const result = await response.json();
    assert.equal(result.rows.length, 24896);
    assert.deepEqual(result.rows[24895], rows[24895]);
    assert.equal(result.ok, true);
  });
  it("preserves failed SAP results for the existing error display", async () => {
    const result = { ok: false, status: 0, latency: 180000, message: "Request timed out", rows: [] };
    assert.deepEqual(await sapDataResponse(result).json(), result);
  });
  it("joins relative paths and collapses slashes", () => {
    assert.equal(resolveSapUrl("https://sap.local:8000/", "//service_node/action?client=300"), "https://sap.local:8000/service_node/action?client=300");
  });
  it("absolute endpoint overrides base", () => {
    assert.equal(resolveSapUrl("https://a", "http://b/x"), "http://b/x");
  });
  it("requires base url for relative paths", () => {
    assert.throws(() => resolveSapUrl("", "/x"));
  });
  it("flattens nested objects and arrays", () => {
    assert.deepEqual(flattenJson({ HEADER: { PLANT: "1000" }, ITEMS: [{ MATERIAL: "M1" }] }), ["HEADER.PLANT", "ITEMS[].MATERIAL"]);
  });
  it("merge keeps existing, replace drops them", () => {
    const make = (name: string, sort: number) => ({ name, sort });
    assert.deepEqual(mergeFieldNames([{ name: "A", sort: 1 }], ["A", "B"], make, false).map(f => f.name), ["A", "B"]);
    assert.deepEqual(mergeFieldNames([{ name: "A", sort: 1 }], ["B"], make, true).map(f => f.name), ["B"]);
  });
  it("validates headers json", () => {
    assert.equal(parseHeaders('{"x":"1"}').ok, true);
    assert.equal(parseHeaders("[1]").ok, false);
    assert.equal(parseHeaders("{bad").ok, false);
  });
  it("only super admin and admin manage SAP", () => {
    assert.equal(canManageSap("admin"), true);
    assert.equal(canManageSap("super_admin"), true);
    assert.equal(canManageSap("asset_manager"), false);
  });
  it("lists changed field names", () => {
    assert.deepEqual(changedFields({ a: 1, b: 2 }, { a: 1, b: 3 }), ["b"]);
  });
});
