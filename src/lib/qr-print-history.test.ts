import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { qrPrintHistory } from "./qr-print-history";

describe("QR print history", () => {
  it("preserves each output's timestamp, asset, action and authenticated initiator", () => {
    const record = { id: "output-1", asset_id: "asset-1", action: "pdf", created_at: "2026-10-10T15:38:00Z", created_by: "user-1" };
    assert.deepEqual(qrPrintHistory([record], [{ id: "user-1", full_name: "Bala Krishna" }]), [{ ...record, user_name: "Bala Krishna" }]);
  });
  it("orders newest first and keeps the user ID when a profile is unavailable", () => {
    const old = { id: "old", asset_id: "asset-1", action: "print", created_at: "2026-10-09T15:38:00Z", created_by: "former-user" };
    const recent = { ...old, id: "recent", action: "png", created_at: "2026-10-10T15:38:00Z" };
    assert.deepEqual(qrPrintHistory([old, recent], []), [{ ...recent, user_name: null }, { ...old, user_name: null }]);
  });
});