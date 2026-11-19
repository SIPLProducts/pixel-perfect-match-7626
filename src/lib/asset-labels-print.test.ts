import { describe, it, expect } from "vitest";
import { buildLabelsPrintDocument } from "./asset-labels";

const asset = (id: string) => ({ id, asset_id: id, name: "Pump", plant: null, company_code: null, serial_number: null, capitalization_date: null, asset_qr_codes: { token: `tok-${id}` } });

describe("print labels", () => {
  it("embeds a vector QR per asset and no image that must load", async () => {
    const html = await buildLabelsPrintDocument([asset("A1"), asset("A2")], "compact", "HBL");
    expect(html.match(/<svg/g)?.length).toBe(2);
    expect(html).not.toContain("data:image");
  });
});
