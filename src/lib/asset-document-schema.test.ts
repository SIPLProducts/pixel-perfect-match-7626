import { test } from "node:test";
import assert from "node:assert/strict";
import { documentInputSchema, validateDocumentFile, documentSignatureMatches, MAX_DOCUMENT_BYTES } from "./asset-document-schema";

test("asset documents accept warranty, manual and drawing categories only", () => {
  const assetId = "ad56c4f2-2f75-4724-9b3a-bb8e508b3aae";
  for (const documentType of ["warranty", "manual", "drawing"]) assert.equal(documentInputSchema.parse({ assetId, documentType }).documentType, documentType);
  assert.equal(documentInputSchema.safeParse({ assetId, documentType: "other" }).success, false);
});
test("document uploads reject empty, oversized and executable files", () => {
  assert.throws(() => validateDocumentFile({ name: "file.pdf", size: 0 }));
  assert.throws(() => validateDocumentFile({ name: "file.pdf", size: MAX_DOCUMENT_BYTES + 1 }));
  assert.throws(() => validateDocumentFile({ name: "file.exe", size: 100 }));
  assert.equal(validateDocumentFile({ name: "drawing.dwg", size: 100 }).ext, "dwg");
});
test("document contents must match their declared extension", () => {
  assert.equal(documentSignatureMatches("pdf", new TextEncoder().encode("%PDF-1.7")), true);
  assert.equal(documentSignatureMatches("pdf", new TextEncoder().encode("<script>alert(1)</script>")), false);
  assert.equal(documentSignatureMatches("dwg", new TextEncoder().encode("AC1027")), true);
  assert.equal(documentSignatureMatches("dxf", new TextEncoder().encode("0\nSECTION\n2\nHEADER")), true);
});