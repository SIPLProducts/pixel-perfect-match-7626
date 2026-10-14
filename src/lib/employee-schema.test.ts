import { test } from "node:test";
import assert from "node:assert/strict";
import { canManageEmployees, employeeCodeConflict, employeeDeactivationBlocker, employeeSchema, selectableEmployees, wouldCreateManagerLoop } from "./employee-schema";

const rows = [
  { id: "a", employee_code: "EMP-001", manager_id: null, status: "active" },
  { id: "b", employee_code: "EMP-002", manager_id: "a", status: "active" },
  { id: "c", employee_code: "EMP-003", manager_id: "b", status: "inactive" },
];

test("code is required, uppercased, 2-20 letters/digits/dashes; name required", () => {
  assert.equal(employeeSchema.parse({ code: " emp-9 ", fullName: "Ravi" }).code, "EMP-9");
  assert.equal(employeeSchema.safeParse({ code: "E", fullName: "Ravi" }).success, false);
  assert.equal(employeeSchema.safeParse({ code: "EMP 1", fullName: "Ravi" }).success, false);
  assert.equal(employeeSchema.safeParse({ code: "EMP1", fullName: "" }).success, false);
  assert.equal(employeeSchema.safeParse({ code: "EMP1", fullName: "Ravi", email: "bad" }).success, false);
  assert.equal(employeeSchema.parse({ code: "EMP1", fullName: "Ravi", email: "" }).email, null);
});

test("duplicate codes detected case-insensitively, ignoring the edited row", () => {
  assert.equal(employeeCodeConflict(rows, "emp-002"), true);
  assert.equal(employeeCodeConflict(rows, "EMP-002", "b"), false);
});

test("manager loops are rejected", () => {
  assert.equal(wouldCreateManagerLoop(rows, "a", "a"), true);
  assert.equal(wouldCreateManagerLoop(rows, "a", "c"), true);
  assert.equal(wouldCreateManagerLoop(rows, "c", "a"), false);
});

test("open transfer custodian blocks deactivation", () => {
  assert.match(employeeDeactivationBlocker("b", ["b"]) ?? "", /open transfers/);
  assert.equal(employeeDeactivationBlocker("a", ["b"]), null);
});

test("inactive employees hidden from new choices unless already selected", () => {
  assert.deepEqual(selectableEmployees(rows).map((r) => r.id), ["a", "b"]);
  assert.deepEqual(selectableEmployees(rows, "c").map((r) => r.id), ["a", "b", "c"]);
});

test("only manager roles can change employees", () => {
  assert.equal(canManageEmployees("facility_manager"), true);
  assert.equal(canManageEmployees("viewer"), false);
});
