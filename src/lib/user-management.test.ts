import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { accessFor, assignableRoles, changeBlocker, inviteSchema, templateRoles } from "./user-management";

const base = { callerId: "a", callerRole: "super_admin", targetId: "b", targetRole: "employee", activeSuperAdmins: 2, targetActive: true };

test("super admin can assign every role including super admin", () => {
  assert.ok(assignableRoles("super_admin").includes("super_admin"));
  assert.equal(changeBlocker({ ...base, newRole: "super_admin" }), null);
});
test("admin cannot assign admin or super admin, nor manage admins", () => {
  assert.ok(!assignableRoles("admin").includes("admin"));
  assert.ok(!assignableRoles("admin").includes("super_admin"));
  assert.equal(changeBlocker({ ...base, callerRole: "admin", newRole: "admin" }), "You cannot assign this role");
  assert.equal(changeBlocker({ ...base, callerRole: "admin", targetRole: "admin", newActive: false }), "You cannot manage this user's role");
});
test("other roles cannot manage users", () => {
  assert.deepEqual(assignableRoles("client_tester"), []);
  assert.equal(changeBlocker({ ...base, callerRole: "asset_manager", newActive: false }), "You do not have permission to manage users");
});
test("nobody can change their own role or status", () => {
  assert.equal(changeBlocker({ ...base, targetId: "a", targetRole: "super_admin", newRole: "admin" }), "You cannot change your own role or status");
  assert.equal(changeBlocker({ ...base, targetId: "a", targetRole: "super_admin", newActive: false }), "You cannot change your own role or status");
});
test("last active super admin is protected", () => {
  assert.equal(changeBlocker({ ...base, targetRole: "super_admin", activeSuperAdmins: 1, newActive: false }), "The workspace must keep at least one active Super admin");
  assert.equal(changeBlocker({ ...base, targetRole: "super_admin", activeSuperAdmins: 2, newActive: false }), null);
});
test("invite form validation", () => {
  assert.ok(!inviteSchema.safeParse({ fullName: "A", email: "x@y.com", role: "viewer" }).success);
  assert.ok(!inviteSchema.safeParse({ fullName: "Asha", email: "nope", role: "viewer" }).success);
  assert.ok(!inviteSchema.safeParse({ fullName: "Asha", email: "a@b.com", role: "owner" }).success);
  assert.equal(inviteSchema.parse({ fullName: "Asha", email: " A@B.com ", role: "client_tester" }).email, "a@b.com");
});
test("matrix matches the server role lists", () => {
  assert.equal(accessFor("client_tester", "categories").edit, false);
  assert.equal(accessFor("client_tester", "transfers").edit, false);
  assert.equal(accessFor("client_tester", "assets").edit, true);
  assert.equal(accessFor("client_tester", "users").view, false);
  assert.equal(accessFor("facility_manager", "locations").edit, true);
  assert.equal(accessFor("facility_manager", "categories").edit, false);
  assert.equal(accessFor("it_manager", "transfers").edit, true);
  assert.equal(accessFor("admin", "users").edit, true);
});
test("template-link roles match the database rule", () => {
  const sql = readFileSync("drizzle/migrations/0027_category_templates_active_members.sql", "utf8");
  const roles = [...(sql.match(/r\.role IN \(([^)]*)\)/)?.[1] ?? "").matchAll(/'(\w+)'/g)].map((m) => m[1]);
  assert.deepEqual(new Set(roles), templateRoles);
});
