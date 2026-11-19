import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLabelsPrintDocument } from "./asset-labels";

const asset = (id: string) => ({ id, asset_id: id, name: "Pump", plant: null, company_code: null, serial_number: null, capitalization_date: null, asset_qr_codes: { token: `tok-${id}` } });

test("print labels embed a vector QR per asset and no image that must load", async () => {
  const html = await buildLabelsPrintDocument([asset("A1"), asset("A2")], "compact", "HBL");
  assert.equal(html.match(/<svg/g)?.length, 2);
  assert.ok(!html.includes("data:image"));
});

test("print QR has a fixed millimetre size that fits the sticker", async () => {
  const html = await buildLabelsPrintDocument([asset("A1")], "compact", "HBL");
  assert.match(html, /<svg width="26mm" height="26mm"/);
});
