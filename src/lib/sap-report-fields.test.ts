import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sapReportFields, sapFieldValue } from "./sap-report-fields";
import { mapSapRow } from "./sap-asset-sync";
describe("SAP report fields", () => {
  it("lists all 69 API keys", () => { assert.equal(sapReportFields.length, 69); assert.equal(new Set(sapReportFields.map(f => f[0])).size, 69); });
  it("sync keeps the full raw row", () => { const row = { ANLN1: "20005720", BTR17: 13131 }; assert.deepEqual(mapSapRow(row)?.sap_fields, row); });
  it("formats values", () => { assert.equal(sapFieldValue({ BTR21: 51500 }, "BTR21"), "51,500"); assert.equal(sapFieldValue(null, "X"), "—"); });
});
