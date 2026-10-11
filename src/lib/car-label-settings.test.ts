import { test } from "node:test";
import assert from "node:assert/strict";
import { carLabelLayout, carLabelPresets, defaultCarLabelSettings, validateCarLabelSettings } from "./car-label-settings";

test("selected sticker dimensions are retained exactly in the shared layout", () => {
 const layout = carLabelLayout({ ...defaultCarLabelSettings, width: 110, height: 65 });
 assert.equal(layout.width, 110);
 assert.equal(layout.height, 65);
});
test("QR scale changes the QR without changing sticker dimensions", () => {
 const full = carLabelLayout(defaultCarLabelSettings);
 const smaller = carLabelLayout({ ...defaultCarLabelSettings, qrScale: 60 });
 assert.equal(smaller.qr.size, full.qr.size * 0.6);
 assert.equal(smaller.width, full.width);
 assert.equal(smaller.height, full.height);
});
test("QR remains square and inside its panel for every preset and extreme aspect ratio", () => {
 for (const size of [...Object.values(carLabelPresets), { width: 40, height: 200 }, { width: 200, height: 40 }]) {
  const { panel, qr, websiteHeight } = carLabelLayout({ ...defaultCarLabelSettings, ...size });
  assert.ok(qr.size > 0);
  assert.ok(qr.x > panel.x);
  assert.ok(qr.x + qr.size < panel.x + panel.width);
  assert.ok(qr.y > panel.y);
  assert.ok(qr.y + qr.size < panel.y + panel.height - websiteHeight);
 }
});
test("invalid dimensions and scaling cannot reach print output", () => {
 for (const values of [{ width: 0 }, { height: Number.NaN }, { width: 201 }, { qrScale: 101 }, { brandingScale: 0 }]) {
  assert.throws(() => validateCarLabelSettings({ ...defaultCarLabelSettings, ...values }));
 }
});