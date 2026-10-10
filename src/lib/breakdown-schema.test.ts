import { describe, expect, test } from "bun:test";
import { breakdownSchema, imageExtension } from "./breakdown-schema";
describe("QR breakdown reports", () => {
  test("requires a QR identity and breakdown details, not editable asset information", () => {
    const parsed = breakdownSchema.parse({token:"11111111-1111-4111-8111-111111111111", title:"Fan stopped", details:"The motor stops after switching on.", assetId:"another asset", organizationId:"another organization"});
    expect(parsed).not.toHaveProperty("assetId");
    expect(parsed).not.toHaveProperty("organizationId");
    expect(breakdownSchema.safeParse({...parsed, details:""}).success).toBe(false);
    expect(breakdownSchema.safeParse({...parsed, token:"invalid"}).success).toBe(false);
  });
  test("accepts photos but rejects disguised non-image files", () => {
    expect(imageExtension(new Uint8Array([255,216,255,224]))).toBe("jpg");
    expect(imageExtension(new Uint8Array([137,80,78,71,13,10,26,10]))).toBe("png");
    expect(imageExtension(new TextEncoder().encode("<script>not a photo</script>"))).toBeNull();
  });
});