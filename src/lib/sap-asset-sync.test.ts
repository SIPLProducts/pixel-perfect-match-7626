import { test as it } from "node:test";
import assert from "node:assert/strict";
import { mapSapRow, mapSapRows, sapAssetId, sapDate } from "./sap-asset-sync";
it("uses the SAP asset number as the register ID", () => assert.equal(sapAssetId({ ANLN1: "1000123", ANLN2: "0000" }), "1000123"));
it("adds a non-zero sub-number so sub-assets stay separate", () => assert.equal(sapAssetId({ ANLN1: "1000123", ANLN2: "0001" }), "1000123-0001"));
it("skips rows without an SAP asset number", () => assert.equal(mapSapRows([{ TXT50: "x" }, { ANLN1: "5" }]).length, 1));
it("reads SAP dates in common formats and ignores empty ones", () => { assert.equal(sapDate("20200131"), "2020-01-31"); assert.equal(sapDate("31.01.2020"), "2020-01-31"); assert.equal(sapDate("00000000"), null); });
it("maps plant, description and book value", () => { const r = mapSapRow({ ANLN1: "7", TXT50: "Pump", WERKS: "1100", BUCHWERT: "1,250.50" })!; assert.deepEqual([r.name, r.plant, r.current_value], ["Pump", "1100", 1250.5]); });
