import { test } from "node:test";
import assert from "node:assert/strict";
import { canSetPassword, parseAuthLink } from "./auth-link";

test("invite link with session is accepted", () => {
  const l = parseAuthLink("#access_token=x&type=invite", "");
  assert.equal(l.kind, "invite");
  assert.equal(canSetPassword(l, true), true);
});
test("recovery link with session is accepted", () => {
  assert.equal(canSetPassword(parseAuthLink("#type=recovery", ""), true), true);
});
test("expired link is refused", () => {
  const l = parseAuthLink("#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired", "");
  assert.equal(l.error, "Email link is invalid or has expired");
  assert.equal(canSetPassword(l, true), false);
});
test("missing session is refused", () => {
  assert.equal(canSetPassword(parseAuthLink("#type=invite", ""), false), false);
});
test("plain visit is refused", () => {
  assert.equal(canSetPassword(parseAuthLink("", ""), true), false);
});
