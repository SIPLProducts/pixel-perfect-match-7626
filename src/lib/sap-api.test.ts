import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canManageSap, changedFields, flattenJson, mergeFieldNames, parseHeaders, resolveSapUrl } from "./sap-api";

describe("sap api helpers", () => {
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
