import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { breakdownSchema, imageExtension } from "./breakdown-schema";
describe("QR breakdown reports", () => {
  test("requires a QR identity and breakdown details, not editable asset information", () => {
    const parsed = breakdownSchema.parse({token:"11111111-1111-4111-8111-111111111111", title:"Fan stopped", details:"The motor stops after switching on.", assetId:"another asset", organizationId:"another organization"});
    assert.equal("assetId" in parsed, false);
    assert.equal("organizationId" in parsed, false);
    assert.equal(breakdownSchema.safeParse({...parsed, details:""}).success, false);
    assert.equal(breakdownSchema.safeParse({...parsed, token:"invalid"}).success, false);
  });
  test("accepts photos but rejects disguised non-image files", () => {
    assert.equal(imageExtension(new Uint8Array([255,216,255,224])), "jpg");
    assert.equal(imageExtension(new Uint8Array([137,80,78,71,13,10,26,10])), "png");
    assert.equal(imageExtension(new TextEncoder().encode("<script>not a photo</script>")), null);
  });
});