import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { accessFor, assignableRoles, changeBlocker, editableModuleCount, inviteSchema, permissionModules, roleSummary, templateRoles } from "./user-management";

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
test("role card counts match the 13-module matrix", () => {
  const expected: Record<string, [number, number]> = { super_admin: [13, 10], admin: [13, 10], asset_manager: [12, 9], facility_manager: [12, 7], it_manager: [12, 5], finance: [12, 4], auditor: [12, 4], employee: [12, 4], viewer: [12, 4], client_tester: [12, 4] };
  for (const [role, [v, e]] of Object.entries(expected)) {
    const s = roleSummary(role);
    assert.deepEqual([s.viewCount, s.editCount], [v, e], role);
    assert.equal(permissionModules.filter((m) => accessFor(role, m.id).view).length, v);
  }
  assert.equal(permissionModules.length, 13);
  assert.equal(editableModuleCount, 10);
});
test("audit trail is visible to every role and never editable", () => {
  for (const r of ["super_admin", "viewer", "client_tester", "auditor"]) assert.deepEqual(accessFor(r, "audit"), { view: true, edit: null });
});
test("restricted areas are listed separately from operational edits", () => {
  assert.deepEqual(roleSummary("facility_manager").restricted, ["Locations", "Employees", "Transfers (create, edit, approve)"]);
  assert.deepEqual(roleSummary("finance").restricted, []);
});
test("deactivation never applies an account-wide sign-in ban", () => {
  const src = readFileSync("src/lib/user-management.functions.ts", "utf8");
  assert.ok(!/ban_duration:\s*(data\.active\s*\?|BAN|"8)/.test(src));
});

import { createUserSchema, mustChangePassword, usernameSchema, PASSWORD_MAX } from "./user-management";
const validUser = { firstName: "Ravi", email: "Ravi@Example.com", status: "active", role: "employee", password: "Secret123", confirmPassword: "Secret123" };
test("create user requires first name, email, status, role and matching 8-72 char password", () => {
  assert.ok(createUserSchema.safeParse(validUser).success);
  assert.equal(createUserSchema.parse(validUser).email, "ravi@example.com");
  for (const k of ["firstName", "email", "status", "role", "password"]) assert.ok(!createUserSchema.safeParse({ ...validUser, [k]: undefined }).success, k);
  assert.ok(!createUserSchema.safeParse({ ...validUser, password: "short7!", confirmPassword: "short7!" }).success);
  const long = "a".repeat(PASSWORD_MAX + 1);
  assert.ok(!createUserSchema.safeParse({ ...validUser, password: long, confirmPassword: long }).success);
  assert.ok(!createUserSchema.safeParse({ ...validUser, confirmPassword: "Different1" }).success);
});
test("username is optional, otherwise 3-30 letters, digits, _ or .", () => {
  for (const ok of ["", "abc", "ravi.k_01", "a".repeat(30)]) assert.ok(usernameSchema.safeParse(ok).success, ok);
  for (const bad of ["ab", "a".repeat(31), "ravi-k", "ravi k", "ravi@x"]) assert.ok(!usernameSchema.safeParse(bad).success, bad);
});
test("plant and department must be ids when given", () => {
  assert.ok(!createUserSchema.safeParse({ ...validUser, plantId: "HYD" }).success);
});
test("only the server-controlled app_metadata flag forces a password change", () => {
  assert.equal(mustChangePassword({ app_metadata: { must_change_password: true } }), true);
  assert.equal(mustChangePassword({ user_metadata: { must_change_password: true } }), false);
  assert.equal(mustChangePassword({ app_metadata: {} }), false);
  assert.equal(mustChangePassword(undefined), false);
});
test("every protected server function uses the first-login enforcing middleware", () => {
  for (const f of ["asset360", "asset-documents", "category", "employee", "location", "service-request", "user-management"]) {
    const src = readFileSync(new URL(`./${f}.functions.ts`, import.meta.url), "utf8");
    const plain = src.match(/\.middleware\(\[requireSupabaseAuth\]\)/g)?.length ?? 0;
    assert.equal(plain, f === "user-management" ? 2 : 0, f);
  }
});
test("user creation never overwrites existing accounts and cleans up only the new id", () => {
  const src = readFileSync(new URL("./user-management.functions.ts", import.meta.url), "utf8");
  const body = src.slice(src.indexOf("export const createUser"), src.indexOf("export const passwordChangeStatus"));
  assert.ok(!/updateUserById|upsert/.test(body));
  assert.equal(body.match(/deleteUser\(/g)?.length, 1);
  assert.ok(body.includes('deleteUser(newId)'));
  assert.ok(!/console\.\w+\([^)]*password/i.test(body));
});
test("any 8-72 character password is accepted without complexity rules", () => {
  for (const pw of ["simplepass", "12345678", "aaaaaaaa", "ALLUPPERCASE"]) assert.ok(createUserSchema.safeParse({ ...validUser, password: pw, confirmPassword: pw }).success, pw);
});
