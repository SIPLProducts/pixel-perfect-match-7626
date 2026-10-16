import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveTemplate, setCategoryTemplateSchema } from "./asset-templates";

const P = "00000000-0000-4000-8000-000000000001", L = "00000000-0000-4000-8000-000000000002", X = "00000000-0000-4000-8000-000000000003";
const cats = [{ id: P, parent_id: null }, { id: L, parent_id: P }, { id: X, parent_id: null }];

test("category's own template link is used", () => {
  assert.equal(resolveTemplate(L, cats, [{ category_id: L, template_key: "plant_machinery" }, { category_id: P, template_key: "it_computer" }])?.key, "plant_machinery");
});
test("subcategory inherits its parent's template", () => {
  assert.equal(resolveTemplate(L, cats, [{ category_id: P, template_key: "it_computer" }])?.key, "it_computer");
});
test("unmapped category gets no template", () => {
  assert.equal(resolveTemplate(X, cats, [{ category_id: P, template_key: "it_computer" }]), null);
});
test("unknown template keys are rejected", () => {
  assert.equal(setCategoryTemplateSchema.safeParse({ categoryId: P, templateKey: "other" }).success, false);
});
