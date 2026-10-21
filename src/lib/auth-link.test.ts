import { describe, expect, test } from "bun:test";
import { canSetPassword, parseAuthLink } from "./auth-link";

describe("auth link", () => {
  test("invite link with session is accepted", () => {
    const l = parseAuthLink("#access_token=x&type=invite", "");
    expect(l.kind).toBe("invite");
    expect(canSetPassword(l, true)).toBe(true);
  });
  test("recovery link with session is accepted", () => {
    expect(canSetPassword(parseAuthLink("#type=recovery", ""), true)).toBe(true);
  });
  test("expired link is refused", () => {
    const l = parseAuthLink("#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired", "");
    expect(l.error).toBe("Email link is invalid or has expired");
    expect(canSetPassword(l, true)).toBe(false);
  });
  test("missing session is refused", () => {
    expect(canSetPassword(parseAuthLink("#type=invite", ""), false)).toBe(false);
  });
  test("plain visit is refused", () => {
    expect(canSetPassword(parseAuthLink("", ""), true)).toBe(false);
  });
});
