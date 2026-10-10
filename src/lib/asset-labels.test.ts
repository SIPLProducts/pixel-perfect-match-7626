import { test } from "node:test";
import assert from "node:assert/strict";
import { assetVerificationUrl } from "./asset-labels";

const token = "11111111-1111-4111-8111-111111111111";
test("QR labels open the public asset profile even when generated in preview", () => {
  assert.equal(assetVerificationUrl("https://id-preview--7dc2fda9-8481-4a39-8a5b-00318a1132c0.lovable.app", token), `https://qrmyassets.siplproducts.com/a/${token}`);
});
test("local and published label generation preserve the same public QR identity", () => {
  for (const origin of ["http://localhost:8080", "https://pixel-perfect-match-7626.lovable.app", "https://qrmyassets.siplproducts.com"]) {
    assert.equal(assetVerificationUrl(origin, token), `https://qrmyassets.siplproducts.com/a/${token}`);
  }
});