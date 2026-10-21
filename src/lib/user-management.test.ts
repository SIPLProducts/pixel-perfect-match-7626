import { test } from "node:test";
import assert from "node:assert/strict";
import { assignableRoles, canManageMember, inviteUserSchema, isUserAdmin, removesLastSuperAdmin } from "./user-management";

test("only super admins and admins can open user management; client testers cannot", () => {
  assert.equal(isUserAdmin("super_admin"), true);
  assert.equal(isUserAdmin("admin"), true);
  assert.equal(isUserAdmin("client_tester"), false);
  assert.equal(isUserAdmin("asset_manager"), false);
  assert.deepEqual(assignableRoles("client_tester"), []);
});

test("admins cannot assign the admin or super admin roles", () => {
  const roles = assignableRoles("admin");
  assert.equal(roles.includes("admin"), false);
  assert.equal(roles.includes("super_admin"), false);
  assert.equal(roles.includes("client_tester"), true);
  assert.equal(assignableRoles("super_admin").includes("super_admin"), true);
});

test("nobody can change their own account, and admins cannot manage administrators", () => {
  assert.equal(canManageMember({ userId: "a", role: "super_admin" }, { userId: "a", role: "super_admin" }), false);
  assert.equal(canManageMember({ userId: "a", role: "admin" }, { userId: "b", role: "super_admin" }), false);
  assert.equal(canManageMember({ userId: "a", role: "admin" }, { userId: "b", role: "client_tester" }), true);
  assert.equal(canManageMember({ userId: "a", role: "client_tester" }, { userId: "b", role: "viewer" }), false);
});

test("a workspace always keeps one active super admin", () => {
  assert.equal(removesLastSuperAdmin(1, { role: "super_admin", active: true }, { role: "super_admin", active: false }), true);
  assert.equal(removesLastSuperAdmin(1, { role: "super_admin", active: true }, { role: "admin", active: true }), true);
  assert.equal(removesLastSuperAdmin(2, { role: "super_admin", active: true }, { role: "super_admin", active: false }), false);
});

test("invites need a name, a valid email and a known role", () => {
  const base = { fullName: "Test User", email: "tester@example.com", role: "client_tester", redirectOrigin: "https://qrmyassets.siplproducts.com" };
  assert.equal(inviteUserSchema.safeParse(base).success, true);
  assert.equal(inviteUserSchema.safeParse({ ...base, email: "nope" }).success, false);
  assert.equal(inviteUserSchema.safeParse({ ...base, role: "owner" }).success, false);
  assert.equal(inviteUserSchema.safeParse({ ...base, redirectOrigin: "http://evil.com" }).success, false);
});
